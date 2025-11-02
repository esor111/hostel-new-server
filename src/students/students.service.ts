import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Student, StudentStatus } from './entities/student.entity';
import { StudentContact, ContactType } from './entities/student-contact.entity';
import { StudentAcademicInfo } from './entities/student-academic-info.entity';
import { StudentFinancialInfo, FeeType } from './entities/student-financial-info.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { ConfigureStudentDto } from './dto/configure-student.dto';
import { BookingGuest, GuestStatus } from '../bookings/entities/booking-guest.entity';
import { Bed, BedStatus } from '../rooms/entities/bed.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomOccupant } from '../rooms/entities/room-occupant.entity';
import { BedSyncService } from '../rooms/bed-sync.service';
import { AdvancePaymentService } from './services/advance-payment.service';
import { CheckoutSettlementService } from './services/checkout-settlement.service';
import { InvoicesService } from '../invoices/invoices.service';
import { Payment } from '../payments/entities/payment.entity';
// import { HostelScopedService } from '../common/services/hostel-scoped.service'; // Commented out for backward compatibility

@Injectable()
export class StudentsService { // Removed HostelScopedService extension for backward compatibility
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
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(RoomOccupant)
    private roomOccupantRepository: Repository<RoomOccupant>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private bedSyncService: BedSyncService,
    private advancePaymentService: AdvancePaymentService,
    private checkoutSettlementService: CheckoutSettlementService,
    private invoicesService: InvoicesService,
  ) {
    // super(studentRepository, 'Student'); // Commented out for backward compatibility
  }

  async findAll(filters: any = {}, hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const { status = 'all', search = '', page = 1, limit = 50 } = filters;

    const queryBuilder = this.studentRepository.createQueryBuilder('student')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoinAndSelect('student.contacts', 'contacts')
      .leftJoinAndSelect('student.academicInfo', 'academic')
      .leftJoinAndSelect('student.financialInfo', 'financial');

    // Apply hostel filter (required)
    queryBuilder.where('student.hostelId = :hostelId', { hostelId });

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

    // Order by updated date first (for recently configured students), then creation date
    queryBuilder.orderBy('student.updatedAt', 'DESC')
      .addOrderBy('student.createdAt', 'DESC');

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

  async findOne(id: string, hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const whereCondition: any = { id, hostelId };

    const student = await this.studentRepository.findOne({
      where: whereCondition,
      relations: ['room', 'contacts', 'academicInfo', 'financialInfo']
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.transformToApiResponse(student);
  }

  async create(createStudentDto: any, hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    // Look up room by room number if provided
    let roomId = null;
    if (createStudentDto.roomNumber) {
      const room = await this.roomRepository.findOne({
        where: {
          roomNumber: createStudentDto.roomNumber,
          hostelId: hostelId
        }
      });

      if (!room) {
        throw new BadRequestException(`Room with number '${createStudentDto.roomNumber}' not found in this hostel`);
      }

      roomId = room.id;
    }

    // Create student entity with hostelId
    const student = this.studentRepository.create({
      id: createStudentDto.id,
      userId: createStudentDto.userId, // Link to user from JWT
      name: createStudentDto.name,
      phone: createStudentDto.phone,
      email: createStudentDto.email,
      enrollmentDate: createStudentDto.enrollmentDate,
      status: createStudentDto.status || StudentStatus.ACTIVE,
      address: createStudentDto.address,
      roomId: roomId,
      hostelId: hostelId, // Set hostelId (validated above)
      // bookingRequestId: createStudentDto.bookingRequestId // Removed during transition
    });

    const savedStudent = await this.studentRepository.save(student);

    // Create related entities
    await this.createRelatedEntities(savedStudent.id, createStudentDto);

    // Return in API format
    return this.findOne(savedStudent.id, hostelId);
  }

  async update(id: string, updateStudentDto: any, hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const student = await this.findOne(id, hostelId);

    // Look up room by room number if provided
    let roomId = student.roomId; // Keep existing room if no change
    if (updateStudentDto.roomNumber !== undefined) {
      if (updateStudentDto.roomNumber) {
        // Find room by room number within the hostel
        const room = await this.roomRepository.findOne({
          where: {
            roomNumber: updateStudentDto.roomNumber,
            hostelId: hostelId
          }
        });

        if (!room) {
          throw new BadRequestException(`Room with number '${updateStudentDto.roomNumber}' not found in this hostel`);
        }

        roomId = room.id;
      } else {
        // Empty string means unassign room
        roomId = null;
      }
    }

    // Update main student entity
    await this.studentRepository.update(id, {
      name: updateStudentDto.name,
      phone: updateStudentDto.phone,
      email: updateStudentDto.email,
      enrollmentDate: updateStudentDto.enrollmentDate,
      status: updateStudentDto.status,
      address: updateStudentDto.address,
      roomId: roomId,
    });

    // Update related entities
    await this.updateRelatedEntities(id, updateStudentDto);

    return this.findOne(id, hostelId);
  }

  async getPendingConfigurationStudents(hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const whereCondition: any = {
      status: StudentStatus.PENDING_CONFIGURATION,
      isConfigured: false,
      hostelId
    };

    const students = await this.studentRepository.find({
      where: whereCondition,
      relations: ['room', 'contacts', 'academicInfo', 'financialInfo'],
      order: { createdAt: 'DESC' }
    });

    // Transform to API response format
    const transformedItems = await Promise.all(
      students.map(student => this.transformToApiResponse(student))
    );

    return {
      items: transformedItems,
      count: transformedItems.length,
      message: transformedItems.length > 0
        ? `Found ${transformedItems.length} students pending configuration`
        : 'No students pending configuration'
    };
  }

  async getStats(hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const totalStudents = await this.studentRepository.count({
      where: { hostelId }
    });
    const activeStudents = await this.studentRepository.count({
      where: { hostelId, status: StudentStatus.ACTIVE }
    });
    const inactiveStudents = await this.studentRepository.count({
      where: { hostelId, status: StudentStatus.INACTIVE }
    });
    const pendingConfigurationStudents = await this.studentRepository.count({
      where: { hostelId, status: StudentStatus.PENDING_CONFIGURATION }
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
      pendingConfigurationStudents,
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

    // Calculate current balance from LedgerV2 (new system)
    let currentBalance = 0;
    let advanceBalance = 0;
    
    try {
      // Import LedgerV2Service dynamically to get balance
      const { LedgerV2Service } = await import('../ledger-v2/services/ledger-v2.service');
      const ledgerV2Repository = this.ledgerRepository.manager.getRepository('LedgerEntryV2');
      
      const balanceResult = await ledgerV2Repository
        .createQueryBuilder('ledger')
        .select('SUM(ledger.debit)', 'totalDebits')
        .addSelect('SUM(ledger.credit)', 'totalCredits')
        .where('ledger.studentId = :studentId', { studentId: student.id })
        .andWhere('ledger.isReversed = :isReversed', { isReversed: false })
        .getRawOne();

      const totalDebits = parseFloat(balanceResult?.totalDebits) || 0;
      const totalCredits = parseFloat(balanceResult?.totalCredits) || 0;
      const netBalance = totalDebits - totalCredits;

      currentBalance = netBalance > 0 ? netBalance : 0; // Dues (positive balance)
      advanceBalance = netBalance < 0 ? Math.abs(netBalance) : 0; // Advance (negative balance)
    } catch (error) {
      console.error('Error calculating balance from LedgerV2:', error);
      // Fallback to 0 if error
      currentBalance = 0;
      advanceBalance = 0;
    }

    // Return EXACT same structure as current JSON
    return {
      id: student.id,
      name: student.name,
      phone: student.phone,
      email: student.email,
      roomNumber: student.room?.roomNumber || null,
      guardianName: guardianContact?.name || null,
      guardianPhone: guardianContact?.phone || null,
      guardian: guardianContact ? {
        name: guardianContact.name,
        phone: guardianContact.phone,
        relation: guardianContact.relationship
      } : null,
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
      // bookingRequestId: student.bookingRequestId, // Removed during transition
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

  async processCheckout(studentId: string, checkoutDetails: any, hostelId: string) {
    // Use transaction for data consistency
    const queryRunner = this.studentRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const student = await this.findOne(studentId, hostelId);

      // 🏦 PHASE 1: FINANCIAL INTEGRATION - Get current balance from LedgerV2Service
      let currentBalance = { currentBalance: 0, balanceType: 'Cr' };
      try {
        // Import LedgerV2Service dynamically to avoid circular dependency
        const { LedgerV2Service } = await import('../ledger-v2/services/ledger-v2.service');
        const ledgerV2Repository = queryRunner.manager.getRepository('LedgerEntryV2');
        const ledgerV2Service = new LedgerV2Service(
          ledgerV2Repository as any,
          queryRunner.manager.getRepository('Student') as any,
          null as any, // transactionService - will handle manually
          null as any  // calculationService - will handle manually
        );
        
        currentBalance = await ledgerV2Service.getStudentBalance(studentId, hostelId);
        console.log(`💰 Current balance for ${student.name}: NPR ${currentBalance.currentBalance} (${currentBalance.balanceType})`);
      } catch (error) {
        console.warn('⚠️ Could not fetch balance from LedgerV2Service, using fallback calculation');
        // Fallback: Calculate from existing ledger entries
        const balanceResult = await queryRunner.manager
          .createQueryBuilder()
          .select('SUM(ledger.debit)', 'totalDebits')
          .addSelect('SUM(ledger.credit)', 'totalCredits')
          .from('ledger_entries', 'ledger')
          .where('ledger.studentId = :studentId', { studentId })
          .andWhere('ledger.isReversed = false')
          .getRawOne();

        const totalDebits = parseFloat(balanceResult?.totalDebits) || 0;
        const totalCredits = parseFloat(balanceResult?.totalCredits) || 0;
        const netBalance = totalDebits - totalCredits;
        
        currentBalance = {
          currentBalance: netBalance,
          balanceType: netBalance >= 0 ? 'Dr' : 'Cr'
        };
      }

      // Calculate final settlement amounts
      const refundAmount = checkoutDetails.refundAmount || 0;
      const deductionAmount = checkoutDetails.deductionAmount || 0;
      const netSettlement = refundAmount - deductionAmount;

      // 🏦 PHASE 1: FINANCIAL INTEGRATION - Create ledger entries for checkout settlement
      if (refundAmount > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into('ledger_entries_v2')
          .values({
            studentId,
            hostelId,
            type: 'ADJUSTMENT',
            description: `Checkout refund - ${checkoutDetails.notes || 'Final settlement'} - ${student.name}`,
            referenceId: null,
            debit: 0,
            credit: refundAmount,
            date: new Date(),
            notes: `Checkout refund processed during student checkout`,
            isReversed: false,
            entrySequence: () => 'COALESCE((SELECT MAX(entry_sequence) FROM ledger_entries_v2), 0) + 1'
          })
          .execute();
        
        console.log(`💸 Created refund entry: NPR ${refundAmount} for ${student.name}`);
      }

      if (deductionAmount > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into('ledger_entries_v2')
          .values({
            studentId,
            hostelId,
            type: 'ADJUSTMENT',
            description: `Checkout deduction - ${checkoutDetails.notes || 'Damages/utilities'} - ${student.name}`,
            referenceId: null,
            debit: deductionAmount,
            credit: 0,
            date: new Date(),
            notes: `Checkout deduction processed during student checkout`,
            isReversed: false,
            entrySequence: () => 'COALESCE((SELECT MAX(entry_sequence) FROM ledger_entries_v2), 0) + 1'
          })
          .execute();
        
        console.log(`💰 Created deduction entry: NPR ${deductionAmount} for ${student.name}`);
      }

      // Update student status to inactive
      await queryRunner.manager.update('students', studentId, {
        status: StudentStatus.INACTIVE,
        updatedAt: new Date()
      });

      // Clear room assignment if needed
      if (checkoutDetails.clearRoom) {
        await queryRunner.manager.update('students', studentId, {
          roomId: null
        });
      }

      // 🏠 PHASE 2: HISTORICAL TRACKING - Update RoomOccupant with checkout date
      await this.updateRoomOccupancyHistory(queryRunner, studentId, checkoutDetails.checkoutDate);

      // 🛏️ ENHANCED BED RELEASE - Update booking-guest status and free up the bed
      await this.releaseBedAndUpdateBooking(queryRunner, student, checkoutDetails);

      // Commit transaction for basic checkout operations
      await queryRunner.commitTransaction();

      // 🧮 NEPALESE BILLING: Calculate accurate settlement (outside transaction)
      let accurateSettlement = null;
      try {
        const settlementResult = await this.checkoutSettlementService.processCheckoutSettlement(
          studentId,
          checkoutDetails.checkoutDate || new Date().toISOString().split('T')[0],
          hostelId,
          checkoutDetails.notes
        );
        accurateSettlement = settlementResult.settlement;
        console.log(`✅ Accurate settlement processed: ${settlementResult.message}`);
      } catch (error) {
        console.error('❌ Settlement calculation failed:', error);
        // Don't fail checkout if settlement calculation fails
      }

      // 📢 RECENT ACTIVITIES - Log checkout activity
      await this.logCheckoutActivity(student, currentBalance.currentBalance, netSettlement);

      // Use accurate settlement if available, otherwise use basic calculation
      const finalSettlement = accurateSettlement || {
        refundDue: refundAmount,
        additionalDue: deductionAmount,
        netSettlement,
        totalPaymentsMade: 0,
        totalActualUsage: 0,
        usageBreakdown: []
      };

      console.log(`✅ Checkout completed for ${student.name}:`);
      console.log(`   - Initial balance: NPR ${currentBalance.currentBalance}`);
      console.log(`   - Total payments made: NPR ${finalSettlement.totalPaymentsMade?.toLocaleString() || 'N/A'}`);
      console.log(`   - Actual usage: NPR ${finalSettlement.totalActualUsage?.toLocaleString() || 'N/A'}`);
      console.log(`   - Refund due: NPR ${finalSettlement.refundDue?.toLocaleString() || refundAmount.toLocaleString()}`);
      console.log(`   - Room occupancy history updated`);
      console.log(`   - Bed released and made available`);

      return {
        success: true,
        studentId,
        checkoutDate: checkoutDetails.checkoutDate || new Date(),
        finalBalance: currentBalance.currentBalance,
        refundAmount: finalSettlement.refundDue || refundAmount,
        deductionAmount: finalSettlement.additionalDue || deductionAmount,
        netSettlement: finalSettlement.netSettlement || netSettlement,
        accurateSettlement: accurateSettlement,
        message: 'Student checkout processed successfully with Nepalese billing settlement'
      };

    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      console.error('❌ Checkout transaction failed:', error);
      throw new BadRequestException(`Checkout failed: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
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

    // Order by relevance (name match first, then updated date, then creation date)
    queryBuilder.orderBy('student.updatedAt', 'DESC')
      .addOrderBy('student.createdAt', 'DESC');

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

  async bulkUpdate(bulkUpdateDto: any, hostelId: string) {
    const { studentIds, updates } = bulkUpdateDto;
    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const studentId of studentIds) {
      try {
        await this.update(studentId, updates, hostelId);
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

  async remove(id: string, hostelId: string) {
    const student = await this.findOne(id, hostelId);

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

  /**
   * Format student response for API
   * Alias for transformToApiResponse method
   */
  private async formatStudentResponse(student: Student): Promise<any> {
    return this.transformToApiResponse(student);
  }

  /**
   * Find student by userId from JWT token
   * This solves the core problem: userId (from JWT) → studentId (for ledger/discounts/charges)
   */
  async findByUserId(userId: string, hostelId: string): Promise<any> {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const queryBuilder = this.studentRepository.createQueryBuilder('student')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoinAndSelect('student.contacts', 'contacts')
      .leftJoinAndSelect('student.academicInfo', 'academicInfo')
      .leftJoinAndSelect('student.financialInfo', 'financialInfo')
      .where('student.userId = :userId', { userId })
      .andWhere('student.hostelId = :hostelId', { hostelId });

    const student = await queryBuilder.getOne();

    if (!student) {
      return null; // Student not found for this user
    }

    return this.formatStudentResponse(student);
  }

  /**
   * Create or link student to userId
   * This handles the automatic student creation when user first accesses the system
   */
  async createOrLinkStudentForUser(userId: string, userData: any, hostelId: string): Promise<any> {
    // Check if student already exists for this user
    let student = await this.studentRepository.findOne({
      where: { userId, hostelId }
    });

    if (student) {
      return this.findOne(student.id, hostelId);
    }

    // Create new student linked to user
    const createStudentDto = {
      userId, // Link to user from JWT
      name: userData.name || `User ${userId}`,
      email: userData.email || `${userId}@temp.com`,
      phone: userData.phone || `+977${Math.random().toString().substr(2, 10)}`,
      status: StudentStatus.PENDING_CONFIGURATION,
      ...userData
    };

    return this.create(createStudentDto, hostelId);
  }

  /**
   * Get user's financial data (ledger, discounts, charges)
   * This is the main method that solves the problem
   */
  async getUserFinancialData(userId: string, hostelId: string) {
    // Validate hostelId is present
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    // First, find the student record for this user
    const student = await this.findByUserId(userId, hostelId);

    if (!student) {
      throw new NotFoundException(`No student record found for user ${userId}`);
    }

    const studentId = student.id;

    // Now we can get all financial data using studentId
    const [ledgerData, discounts, adminCharges] = await Promise.all([
      this.getStudentLedger(studentId),
      this.getStudentDiscounts(studentId),
      this.getStudentAdminCharges(studentId)
    ]);

    return {
      student,
      ledger: ledgerData,
      discounts,
      adminCharges,
      // Include the mapping for reference
      mapping: {
        userId,
        studentId,
        hostelId
      }
    };
  }

  /**
   * Get student's discounts
   */
  private async getStudentDiscounts(studentId: string) {
    // This will integrate with DiscountsService
    return {
      studentId,
      discounts: [],
      summary: {
        totalActive: 0,
        totalAmount: 0
      }
    };
  }

  /**
   * Get student's admin charges
   */
  private async getStudentAdminCharges(studentId: string) {
    // This will integrate with AdminChargesService
    return {
      studentId,
      charges: [],
      summary: {
        totalPending: 0,
        totalAmount: 0
      }
    };
  }

  async configureStudent(studentId: string, configData: any, hostelId: string) {
    const student = await this.findOne(studentId, hostelId);

    // ✅ CRITICAL FIX: Save guardian information
    if (configData.guardian) {
      // First, deactivate any existing guardian contacts
      await this.contactRepository.update(
        { studentId, type: ContactType.GUARDIAN },
        { isActive: false }
      );

      // Create new guardian contact
      if (configData.guardian.name || configData.guardian.phone) {
        await this.contactRepository.save({
          studentId,
          type: ContactType.GUARDIAN,
          name: configData.guardian.name,
          phone: configData.guardian.phone,
          relationship: configData.guardian.relation,
          isPrimary: true,
          isActive: true
        });
      }
    }

    // ✅ CRITICAL FIX: Save academic information
    if (configData.course || configData.institution) {
      // First, deactivate any existing academic info
      await this.academicRepository.update(
        { studentId },
        { isActive: false }
      );

      // Create new academic info
      await this.academicRepository.save({
        studentId,
        course: configData.course,
        institution: configData.institution,
        academicYear: new Date().getFullYear().toString(),
        isActive: true
      });
    }

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



    // Save financial entries
    if (financialEntries.length > 0) {
      await this.financialRepository.save(financialEntries);
    }

    // Create admin charges for additional charges
    if (configData.additionalCharges && configData.additionalCharges.length > 0) {
      // This will be handled by AdminChargesService when we integrate
      // For now, we'll store them as notes in financial info
    }

    // Save financial entries first
    if (financialEntries.length > 0) {
      await this.financialRepository.save(financialEntries);
    }

    // NEW: Generate immediate configuration-based invoice
    const configurationDate = new Date();
    let firstInvoice = null;
    
    try {
      // Calculate total monthly fee
      const feeCalculation = await this.advancePaymentService.calculateMonthlyFee(studentId);
      
      // Calculate first billing period (config date to next month same date)
      const periodStart = configurationDate;
      const periodEnd = new Date(configurationDate);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      
      // Generate immediate configuration-based invoice
      firstInvoice = await this.invoicesService.createConfigurationBasedInvoice(
        studentId,
        hostelId,
        periodStart,
        periodEnd,
        feeCalculation.totalMonthlyFee,
        configurationDate
      );
      
      console.log(`✅ Immediate invoice generated: NPR ${feeCalculation.totalMonthlyFee.toLocaleString()} for period ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`);
    } catch (error) {
      console.error('❌ Failed to generate immediate invoice:', error);
      throw new BadRequestException(`Configuration failed: ${error.message}`);
    }

    // Mark student as configured and active
    await this.studentRepository.update(studentId, {
      isConfigured: true,
      status: StudentStatus.ACTIVE
    });

    const totalMonthlyFee = financialEntries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      success: true,
      message: 'Student configuration completed successfully with immediate billing',
      studentId,
      configurationDate,
      totalMonthlyFee,
      guardianConfigured: !!(configData.guardian?.name || configData.guardian?.phone),
      academicConfigured: !!(configData.course || configData.institution),
      firstInvoice: {
        invoiceId: firstInvoice.id,
        amount: firstInvoice.total,
        periodStart: firstInvoice.periodStart,
        periodEnd: firstInvoice.periodEnd,
        dueDate: firstInvoice.dueDate,
        status: firstInvoice.status,
        billingType: firstInvoice.billingType
      }
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

  /**
   * 🏠 PHASE 2: HISTORICAL TRACKING - Update room occupancy with checkout date
   */
  private async updateRoomOccupancyHistory(queryRunner: any, studentId: string, checkoutDate?: string) {
    try {
      // Find active occupancy record for this student
      const occupancy = await queryRunner.manager
        .createQueryBuilder()
        .select('*')
        .from('room_occupants', 'occupant')
        .where('occupant.student_id = :studentId', { studentId })
        .andWhere('occupant.check_out_date IS NULL')
        .andWhere('occupant.status = :status', { status: 'Active' })
        .getRawOne();

      if (occupancy) {
        const checkoutDateValue = checkoutDate ? new Date(checkoutDate) : new Date();
        
        await queryRunner.manager
          .createQueryBuilder()
          .update('room_occupants')
          .set({
            check_out_date: checkoutDateValue,
            status: 'Checked_Out',
            notes: 'Student checkout processed',
            updated_at: new Date()
          })
          .where('id = :id', { id: occupancy.id })
          .execute();

        console.log(`🏠 Updated room occupancy history for student ${studentId} - checkout date: ${checkoutDateValue.toISOString().split('T')[0]}`);
      } else {
        console.warn(`⚠️ No active room occupancy found for student ${studentId}`);
      }
    } catch (error) {
      console.error('❌ Error updating room occupancy history:', error);
      // Don't fail the entire checkout, but log the error
    }
  }

  /**
   * 🛏️ ENHANCED BED RELEASE - Robust bed release with multiple lookup strategies
   */
  private async releaseBedAndUpdateBooking(queryRunner: any, student: any, checkoutDetails: any) {
    try {
      // Strategy 1: Find booking guest by student name
      let bookingGuest = await queryRunner.manager
        .createQueryBuilder()
        .select('*')
        .from('booking_guests', 'guest')
        .where('guest.guest_name = :guestName', { guestName: student.name })
        .andWhere('guest.status = :status', { status: GuestStatus.CHECKED_IN })
        .getRawOne();

      // Strategy 2: If name match fails, try by bed assignment
      if (!bookingGuest && student.bedNumber) {
        const bed = await queryRunner.manager
          .createQueryBuilder()
          .select('*')
          .from('beds', 'bed')
          .where('bed.bed_number = :bedNumber', { bedNumber: student.bedNumber })
          .getRawOne();

        if (bed) {
          bookingGuest = await queryRunner.manager
            .createQueryBuilder()
            .select('*')
            .from('booking_guests', 'guest')
            .where('guest.bed_id = :bedId', { bedId: bed.id })
            .andWhere('guest.status = :status', { status: GuestStatus.CHECKED_IN })
            .getRawOne();
        }
      }

      if (bookingGuest) {
        // Update booking guest status to CHECKED_OUT
        await queryRunner.manager
          .createQueryBuilder()
          .update('booking_guests')
          .set({
            status: GuestStatus.CHECKED_OUT,
            actual_check_out_date: checkoutDetails.checkoutDate ? new Date(checkoutDetails.checkoutDate) : new Date(),
            updated_at: new Date()
          })
          .where('id = :id', { id: bookingGuest.id })
          .execute();

        // Use BedSyncService to properly handle bed release (outside transaction)
        if (bookingGuest.bed_id) {
          // We'll call this after transaction commits
          setTimeout(async () => {
            try {
              await this.bedSyncService.handleBookingCancellation(
                [bookingGuest.bed_id],
                `Student checkout: ${student.name} - ${checkoutDetails.notes || 'Regular checkout'}`
              );
              console.log(`✅ Bed ${bookingGuest.bed_id} freed up for student ${student.name} using BedSyncService`);
            } catch (error) {
              console.error('❌ Error in BedSyncService:', error);
            }
          }, 1000);
        }

        console.log(`🛏️ Updated booking guest ${bookingGuest.id} to CHECKED_OUT status`);
      } else {
        console.warn(`⚠️ No booking guest found for student ${student.name} during checkout`);
      }
    } catch (error) {
      console.error('❌ Error updating bed availability during checkout:', error);
      // Don't fail the entire checkout process, but log the error
    }
  }

  /**
   * 📢 RECENT ACTIVITIES - Log checkout activity for dashboard
   */
  private async logCheckoutActivity(student: any, initialBalance: number, netSettlement: number) {
    try {
      // The dashboard service already picks up checkout activities by looking for INACTIVE students
      // with recent updatedAt timestamps, so we don't need to create a separate activity record.
      // The student status update to INACTIVE with updatedAt will automatically appear in recent activities.
      
      console.log(`📢 Checkout activity will appear in dashboard for student: ${student.name}`);
      console.log(`   - Initial balance: NPR ${initialBalance}`);
      console.log(`   - Net settlement: NPR ${netSettlement}`);
      console.log(`   - Activity will be picked up by dashboard service automatically`);
      
      // Optional: If you want to create a specific activity log entry, you could add it here
      // But the current dashboard service already handles this by monitoring student status changes
      
    } catch (error) {
      console.error('❌ Error logging checkout activity:', error);
      // Don't fail checkout for logging errors
    }
  }

  /**
   * 🏦 NEPALESE BILLING: Get payment status for student
   */
  async getPaymentStatus(studentId: string, hostelId: string) {
    try {
      const { NepalesesBillingService } = await import('../billing/services/nepalese-billing.service');
      const nepalesesBillingService = new NepalesesBillingService(
        this.studentRepository,
        null as any, // Will be injected properly when called
        null as any,
        null as any,
        this.financialRepository,
        null as any,
        this.advancePaymentService
      );

      return await nepalesesBillingService.getPaymentStatus(studentId, hostelId);
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw new BadRequestException(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * 🧮 NEPALESE BILLING: Calculate checkout settlement
   */
  async calculateCheckoutSettlement(studentId: string, checkoutDate: string, hostelId: string) {
    try {
      return await this.checkoutSettlementService.calculateCheckoutSettlement(
        studentId,
        checkoutDate,
        hostelId
      );
    } catch (error) {
      console.error('Error calculating checkout settlement:', error);
      throw new BadRequestException(`Failed to calculate settlement: ${error.message}`);
    }
  }

  /**
   * 👁️ CHECKOUT PREVIEW: Get checkout preview without processing
   * Shows what will happen when student checks out
   */
  async getCheckoutPreview(studentId: string, hostelId: string) {
    try {
      // Get student details
      const student = await this.studentRepository.findOne({
        where: { id: studentId, hostelId }
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Get outstanding invoices
      const outstandingInvoices = await this.invoicesService.getOutstandingDues(studentId, hostelId);

      // Calculate total dues
      const totalDues = outstandingInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

      // Get advance payments (payments with type ADVANCE)
      const advancePayments = await this.paymentRepository.find({
        where: {
          studentId,
          paymentType: 'ADVANCE' as any,
          status: 'Completed' as any
        },
        order: { paymentDate: 'DESC' }
      });

      // Calculate total advance
      const totalAdvance = advancePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      // Calculate final amount (positive = student owes, negative = refund due)
      const finalAmount = totalDues - totalAdvance;

      // Determine status
      let status: 'AMOUNT_DUE' | 'REFUND_DUE' | 'SETTLED';
      let summary: string;

      if (finalAmount > 0) {
        status = 'AMOUNT_DUE';
        summary = `NPR ${finalAmount.toLocaleString()} due from student`;
      } else if (finalAmount < 0) {
        status = 'REFUND_DUE';
        summary = `NPR ${Math.abs(finalAmount).toLocaleString()} refund due to student`;
      } else {
        status = 'SETTLED';
        summary = 'Account fully settled';
      }

      // Format response with safe date handling
      const formatDate = (date: any): string | null => {
        if (!date) return null;
        try {
          if (date instanceof Date) {
            return date.toISOString().split('T')[0];
          }
          if (typeof date === 'string') {
            return new Date(date).toISOString().split('T')[0];
          }
          return null;
        } catch (error) {
          return null;
        }
      };

      return {
        studentId: student.id,
        studentName: student.name,
        configurationDate: formatDate(student.enrollmentDate),
        outstandingInvoices: outstandingInvoices.map(inv => ({
          id: inv.id,
          periodLabel: inv.periodLabel || inv.month,
          amount: inv.balanceDue || 0,
          dueDate: formatDate(inv.dueDate)
        })),
        totalDues,
        advancePayments: advancePayments.map(payment => ({
          id: payment.id,
          amount: Number(payment.amount),
          date: formatDate(payment.paymentDate),
          type: payment.paymentType
        })),
        totalAdvance,
        finalAmount,
        status,
        summary
      };
    } catch (error) {
      console.error('Error getting checkout preview:', error);
      throw new BadRequestException(`Failed to get checkout preview: ${error.message}`);
    }
  }
}