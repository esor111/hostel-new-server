import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from './entities/student.entity';
import { StudentContact, ContactType } from './entities/student-contact.entity';
import { StudentAcademicInfo } from './entities/student-academic-info.entity';
import { StudentFinancialInfo, FeeType } from './entities/student-financial-info.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { ConfigureStudentDto } from './dto/configure-student.dto';
import { BookingGuest, GuestStatus } from '../bookings/entities/booking-guest.entity';
import { Bed, BedStatus } from '../rooms/entities/bed.entity';
import { BedSyncService } from '../rooms/bed-sync.service';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StudentContact)
    private contactRepository: Repository<StudentContact>,
    @InjectRepository(StudentAcademicInfo)
    private academicRepository: Repository<StudentAcademicInfo>,
    @InjectRepository(StudentFinancialInfo)
    private financialRepository: Repository<StudentFinancialInfo>,
    @InjectRepository(LedgerEntry)
    private ledgerRepository: Repository<LedgerEntry>,
    private bedSyncService: BedSyncService,
  ) {}

  async findAll(filters: any = {}) {
    const { status = 'all', search = '', page = 1, limit = 50 } = filters;
    
    const queryBuilder = this.studentRepository.createQueryBuilder('student')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoinAndSelect('student.contacts', 'contacts')
      .leftJoinAndSelect('student.academicInfo', 'academic')
      .leftJoinAndSelect('student.financialInfo', 'financial');
    
    // Apply status filter
    if (status !== 'all') {
      queryBuilder.andWhere('student.status = :status', { status });
    }
    
    // Apply search filter
    if (search) {
      queryBuilder.andWhere(
        '(student.name ILIKE :search OR student.phone ILIKE :search OR student.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    
    // Order by creation date
    queryBuilder.orderBy('student.createdAt', 'DESC');
    
    const [students, total] = await queryBuilder.getManyAndCount();
    
    // Transform to API response format (EXACT same as current JSON structure)
    const transformedItems = await Promise.all(
      students.map(student => this.transformToApiResponse(student))
    );
    
    return {
      items: transformedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['room', 'contacts', 'academicInfo', 'financialInfo']
    });
    
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    
    return this.transformToApiResponse(student);
  }

  async create(createStudentDto: any) {
    // Create student entity
    const student = this.studentRepository.create({
      id: createStudentDto.id,
      name: createStudentDto.name,
      phone: createStudentDto.phone,
      email: createStudentDto.email,
      enrollmentDate: createStudentDto.enrollmentDate,
      status: createStudentDto.status || StudentStatus.ACTIVE,
      address: createStudentDto.address,
      roomId: createStudentDto.roomNumber, // This will need room lookup
      bookingRequestId: createStudentDto.bookingRequestId
    });

    const savedStudent = await this.studentRepository.save(student);

    // Create related entities
    await this.createRelatedEntities(savedStudent.id, createStudentDto);

    // Return in API format
    return this.findOne(savedStudent.id);
  }

  async update(id: string, updateStudentDto: any) {
    const student = await this.findOne(id);
    
    // Update main student entity
    await this.studentRepository.update(id, {
      name: updateStudentDto.name,
      phone: updateStudentDto.phone,
      email: updateStudentDto.email,
      enrollmentDate: updateStudentDto.enrollmentDate,
      status: updateStudentDto.status,
      address: updateStudentDto.address,
      roomId: updateStudentDto.roomNumber, // This will need room lookup
    });

    // Update related entities
    await this.updateRelatedEntities(id, updateStudentDto);

    return this.findOne(id);
  }

  async getStats() {
    const totalStudents = await this.studentRepository.count();
    const activeStudents = await this.studentRepository.count({ 
      where: { status: StudentStatus.ACTIVE } 
    });
    const inactiveStudents = await this.studentRepository.count({ 
      where: { status: StudentStatus.INACTIVE } 
    });
    
    // Calculate financial totals from ledger entries (will implement when ledger is ready)
    const balanceResult = await this.studentRepository
      .createQueryBuilder('student')
      .select('SUM(CAST(ledger.balance AS DECIMAL))', 'totalBalance')
      .leftJoin('student.ledgerEntries', 'ledger')
      .where('ledger.balanceType = :type', { type: 'Dr' })
      .getRawOne();

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalBalance: parseFloat(balanceResult?.totalBalance) || 0,
      totalAdvance: 0 // Will calculate from advance payments
    };
  }

  // Transform normalized data back to exact API format
  private async transformToApiResponse(student: Student): Promise<any> {
    // Get guardian contact
    const guardianContact = student.contacts?.find(c => c.type === ContactType.GUARDIAN);
    const emergencyContact = student.contacts?.find(c => c.type === ContactType.EMERGENCY);
    
    // Get current academic info
    const currentAcademic = student.academicInfo?.find(a => a.isActive);
    
    // Get current financial info
    const baseMonthlyFee = student.financialInfo?.find(f => f.feeType === FeeType.BASE_MONTHLY && f.isActive);
    const laundryFee = student.financialInfo?.find(f => f.feeType === FeeType.LAUNDRY && f.isActive);
    const foodFee = student.financialInfo?.find(f => f.feeType === FeeType.FOOD && f.isActive);

    // Calculate current balance from ledger entries
    const balanceResult = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .select('SUM(ledger.debit)', 'totalDebits')
      .addSelect('SUM(ledger.credit)', 'totalCredits')
      .where('ledger.studentId = :studentId', { studentId: student.id })
      .andWhere('ledger.isReversed = :isReversed', { isReversed: false })
      .getRawOne();

    const totalDebits = parseFloat(balanceResult?.totalDebits) || 0;
    const totalCredits = parseFloat(balanceResult?.totalCredits) || 0;
    const netBalance = totalDebits - totalCredits;
    
    const currentBalance = netBalance > 0 ? netBalance : 0; // Dues (positive balance)
    const advanceBalance = netBalance < 0 ? Math.abs(netBalance) : 0; // Advance (negative balance)

    // Return EXACT same structure as current JSON
    return {
      id: student.id,
      name: student.name,
      phone: student.phone,
      email: student.email,
      roomNumber: student.room?.roomNumber || null,
      guardianName: guardianContact?.name || null,
      guardianPhone: guardianContact?.phone || null,
      address: student.address,
      baseMonthlyFee: baseMonthlyFee?.amount || 0,
      laundryFee: laundryFee?.amount || 0,
      foodFee: foodFee?.amount || 0,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      currentBalance,
      advanceBalance,
      emergencyContact: emergencyContact?.phone || null,
      course: currentAcademic?.course || null,
      institution: currentAcademic?.institution || null,
      idProofType: null, // Will add to student entity if needed
      idProofNumber: null, // Will add to student entity if needed
      bookingRequestId: student.bookingRequestId,
      updatedAt: student.updatedAt,
      isConfigured: student.isConfigured || false,
      bedNumber: student.bedNumber
    };
  }

  private async createRelatedEntities(studentId: string, dto: any) {
    // Create guardian contact if provided
    if (dto.guardianName || dto.guardianPhone) {
      await this.contactRepository.save({
        studentId,
        type: ContactType.GUARDIAN,
        name: dto.guardianName,
        phone: dto.guardianPhone,
        isPrimary: true,
        isActive: true
      });
    }

    // Create emergency contact if provided
    if (dto.emergencyContact) {
      await this.contactRepository.save({
        studentId,
        type: ContactType.EMERGENCY,
        name: 'Emergency Contact',
        phone: dto.emergencyContact,
        isPrimary: false,
        isActive: true
      });
    }

    // Create academic info if provided
    if (dto.course || dto.institution) {
      await this.academicRepository.save({
        studentId,
        course: dto.course,
        institution: dto.institution,
        isActive: true
      });
    }

    // Create financial info
    const financialEntries = [];
    
    if (dto.baseMonthlyFee) {
      financialEntries.push({
        studentId,
        feeType: FeeType.BASE_MONTHLY,
        amount: dto.baseMonthlyFee,
        effectiveFrom: new Date(),
        isActive: true
      });
    }

    if (dto.laundryFee) {
      financialEntries.push({
        studentId,
        feeType: FeeType.LAUNDRY,
        amount: dto.laundryFee,
        effectiveFrom: new Date(),
        isActive: true
      });
    }

    if (dto.foodFee) {
      financialEntries.push({
        studentId,
        feeType: FeeType.FOOD,
        amount: dto.foodFee,
        effectiveFrom: new Date(),
        isActive: true
      });
    }

    if (financialEntries.length > 0) {
      await this.financialRepository.save(financialEntries);
    }
  }

  async getStudentBalance(studentId: string) {
    // This will integrate with LedgerService when available
    // For now, return placeholder structure matching API
    return {
      studentId,
      currentBalance: 0,
      advanceBalance: 0,
      totalPaid: 0,
      totalDue: 0,
      lastPaymentDate: null,
      lastPaymentAmount: 0
    };
  }

  async getStudentLedger(studentId: string) {
    // This will integrate with LedgerService when available
    // For now, return placeholder structure matching API
    return {
      studentId,
      entries: [],
      summary: {
        totalDebits: 0,
        totalCredits: 0,
        currentBalance: 0
      }
    };
  }

  async getStudentPayments(studentId: string) {
    // This will integrate with PaymentsService when available
    // For now, return placeholder structure matching API
    return {
      studentId,
      payments: [],
      summary: {
        totalPayments: 0,
        totalAmount: 0,
        lastPaymentDate: null
      }
    };
  }

  async getStudentInvoices(studentId: string) {
    // This will integrate with InvoicesService when available
    // For now, return placeholder structure matching API
    return {
      studentId,
      invoices: [],
      summary: {
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0
      }
    };
  }

  async processCheckout(studentId: string, checkoutDetails: any) {
    const student = await this.findOne(studentId);
    
    // Update student status to inactive
    await this.studentRepository.update(studentId, {
      status: StudentStatus.INACTIVE
    });

    // Clear room assignment if needed
    if (checkoutDetails.clearRoom) {
      await this.studentRepository.update(studentId, {
        roomId: null
      });
    }

    // CRITICAL FIX: Update booking-guest status and free up the bed using BedSyncService
    try {
      // Find the booking guest record for this student
      const bookingGuestRepository = this.studentRepository.manager.getRepository(BookingGuest);
      
      // Find booking guest by student name (matching logic from enhanced service)
      const bookingGuest = await bookingGuestRepository.findOne({
        where: [
          { guestName: student.name },
          { email: student.email }
        ]
      });

      if (bookingGuest) {
        // Update booking guest status to CHECKED_OUT
        await bookingGuestRepository.update(bookingGuest.id, {
          status: GuestStatus.CHECKED_OUT,
          actualCheckOutDate: checkoutDetails.checkoutDate || new Date()
        });

        // Use BedSyncService to properly handle bed release
        if (bookingGuest.bedId) {
          await this.bedSyncService.handleBookingCancellation(
            [bookingGuest.bedId], 
            `Student checkout: ${student.name}`
          );
          
          console.log(`✅ Bed ${bookingGuest.bedId} freed up for student ${student.name} using BedSyncService`);
        }
      } else {
        console.warn(`⚠️ No booking guest found for student ${student.name} during checkout`);
      }
    } catch (error) {
      console.error('❌ Error updating bed availability during checkout:', error);
      // Don't fail the entire checkout process, but log the error
    }

    // Calculate final settlement
    const finalBalance = 0; // Will calculate from ledger
    const refundAmount = checkoutDetails.refundAmount || 0;
    const deductionAmount = checkoutDetails.deductionAmount || 0;

    return {
      success: true,
      studentId,
      checkoutDate: checkoutDetails.checkoutDate || new Date(),
      finalBalance,
      refundAmount,
      deductionAmount,
      netSettlement: refundAmount - deductionAmount,
      message: 'Student checkout processed successfully'
    };
  }

  async advancedSearch(searchDto: any) {
    const {
      name,
      phone,
      email,
      roomNumber,
      status,
      course,
      institution,
      enrollmentDateFrom,
      enrollmentDateTo,
      balanceMin,
      balanceMax,
      page = 1,
      limit = 50
    } = searchDto;

    const queryBuilder = this.studentRepository.createQueryBuilder('student')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoinAndSelect('student.contacts', 'contacts')
      .leftJoinAndSelect('student.academicInfo', 'academic')
      .leftJoinAndSelect('student.financialInfo', 'financial');

    // Apply search filters
    if (name) {
      queryBuilder.andWhere('student.name ILIKE :name', { name: `%${name}%` });
    }

    if (phone) {
      queryBuilder.andWhere('student.phone ILIKE :phone', { phone: `%${phone}%` });
    }

    if (email) {
      queryBuilder.andWhere('student.email ILIKE :email', { email: `%${email}%` });
    }

    if (roomNumber) {
      queryBuilder.andWhere('room.roomNumber = :roomNumber', { roomNumber });
    }

    if (status) {
      queryBuilder.andWhere('student.status = :status', { status });
    }

    if (course) {
      queryBuilder.andWhere('academic.course ILIKE :course', { course: `%${course}%` });
    }

    if (institution) {
      queryBuilder.andWhere('academic.institution ILIKE :institution', { institution: `%${institution}%` });
    }

    if (enrollmentDateFrom) {
      queryBuilder.andWhere('student.enrollmentDate >= :enrollmentDateFrom', { enrollmentDateFrom });
    }

    if (enrollmentDateTo) {
      queryBuilder.andWhere('student.enrollmentDate <= :enrollmentDateTo', { enrollmentDateTo });
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Order by relevance (name match first, then creation date)
    queryBuilder.orderBy('student.createdAt', 'DESC');

    const [students, total] = await queryBuilder.getManyAndCount();

    // Transform to API response format
    const transformedItems = await Promise.all(
      students.map(student => this.transformToApiResponse(student))
    );

    return {
      items: transformedItems,
      count: total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async bulkUpdate(bulkUpdateDto: any) {
    const { studentIds, updates } = bulkUpdateDto;
    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const studentId of studentIds) {
      try {
        await this.update(studentId, updates);
        updated++;
      } catch (error) {
        failed++;
        errors.push({
          studentId,
          error: error.message
        });
      }
    }

    return {
      updated,
      failed,
      total: studentIds.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async remove(id: string) {
    const student = await this.findOne(id);
    
    // Soft delete - just mark as inactive
    await this.studentRepository.update(id, {
      status: StudentStatus.INACTIVE
    });

    return {
      success: true,
      message: 'Student deleted successfully',
      studentId: id
    };
  }

  async configureStudent(studentId: string, configData: any) {
    const student = await this.findOne(studentId);
    
    // Create/update financial info records
    const financialEntries = [];
    
    if (configData.baseMonthlyFee) {
      financialEntries.push({
        studentId,
        feeType: FeeType.BASE_MONTHLY,
        amount: configData.baseMonthlyFee,
        effectiveFrom: new Date(),
        isActive: true
      });
    }

    if (configData.laundryFee) {
      financialEntries.push({
        studentId,
        feeType: FeeType.LAUNDRY,
        amount: configData.laundryFee,
        effectiveFrom: new Date(),
        isActive: true
      });
    }

    if (configData.foodFee) {
      financialEntries.push({
        studentId,
        feeType: FeeType.FOOD,
        amount: configData.foodFee,
        effectiveFrom: new Date(),
        isActive: true
      });
    }

    if (configData.wifiFee) {
      financialEntries.push({
        studentId,
        feeType: FeeType.UTILITIES,
        amount: configData.wifiFee,
        effectiveFrom: new Date(),
        isActive: true,
        notes: 'WiFi Fee'
      });
    }

    if (configData.maintenanceFee) {
      financialEntries.push({
        studentId,
        feeType: FeeType.MAINTENANCE,
        amount: configData.maintenanceFee,
        effectiveFrom: new Date(),
        isActive: true
      });
    }

    if (configData.securityDeposit) {
      financialEntries.push({
        studentId,
        feeType: FeeType.SECURITY_DEPOSIT,
        amount: configData.securityDeposit,
        effectiveFrom: new Date(),
        isActive: true
      });
    }

    // Save financial entries
    if (financialEntries.length > 0) {
      await this.financialRepository.save(financialEntries);
    }

    // Create admin charges for additional charges
    if (configData.additionalCharges && configData.additionalCharges.length > 0) {
      // This will be handled by AdminChargesService when we integrate
      // For now, we'll store them as notes in financial info
    }

    // Mark student as configured and active
    await this.studentRepository.update(studentId, {
      isConfigured: true,
      status: StudentStatus.ACTIVE
    });

    return {
      success: true,
      message: 'Student configuration completed successfully',
      studentId,
      configurationDate: new Date(),
      totalMonthlyFee: financialEntries.reduce((sum, entry) => sum + entry.amount, 0)
    };
  }

  private async updateRelatedEntities(studentId: string, dto: any) {
    // Update contacts
    if (dto.guardianName !== undefined || dto.guardianPhone !== undefined) {
      await this.contactRepository.update(
        { studentId, type: ContactType.GUARDIAN },
        { name: dto.guardianName, phone: dto.guardianPhone }
      );
    }

    if (dto.emergencyContact !== undefined) {
      await this.contactRepository.update(
        { studentId, type: ContactType.EMERGENCY },
        { phone: dto.emergencyContact }
      );
    }

    // Update academic info
    if (dto.course !== undefined || dto.institution !== undefined) {
      await this.academicRepository.update(
        { studentId, isActive: true },
        { course: dto.course, institution: dto.institution }
      );
    }

    // Update financial info
    if (dto.baseMonthlyFee !== undefined) {
      await this.financialRepository.update(
        { studentId, feeType: FeeType.BASE_MONTHLY, isActive: true },
        { amount: dto.baseMonthlyFee }
      );
    }

    if (dto.laundryFee !== undefined) {
      await this.financialRepository.update(
        { studentId, feeType: FeeType.LAUNDRY, isActive: true },
        { amount: dto.laundryFee }
      );
    }

    if (dto.foodFee !== undefined) {
      await this.financialRepository.update(
        { studentId, feeType: FeeType.FOOD, isActive: true },
        { amount: dto.foodFee }
      );
    }
  }
}