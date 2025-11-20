import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Student, StudentStatus } from './entities/student.entity';
import { StudentContact, ContactType } from './entities/student-contact.entity';
import { StudentAcademicInfo } from './entities/student-academic-info.entity';
import { StudentFinancialInfo, FeeType } from './entities/student-financial-info.entity';
import { BedSwitchAudit } from './entities/bed-switch-audit.entity';
import { LedgerEntry, BalanceType, LedgerEntryType } from '../ledger/entities/ledger-entry.entity';
import { ConfigureStudentDto } from './dto/configure-student.dto';
import { SwitchBedDto } from './dto/switch-bed.dto';
import { CreateManualStudentDto, FloorSelectionResponseDto, RoomSelectionResponseDto, BedSelectionResponseDto } from './dto/create-manual-student.dto';
import { BookingGuest, GuestStatus } from '../bookings/entities/booking-guest.entity';
import { Bed, BedStatus } from '../rooms/entities/bed.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomOccupant } from '../rooms/entities/room-occupant.entity';
import { Hostel } from '../hostel/entities/hostel.entity';
import { BedSyncService } from '../rooms/bed-sync.service';
import { AdvancePaymentService } from './services/advance-payment.service';
import { CheckoutSettlementService } from './services/checkout-settlement.service';
import { InvoicesService } from '../invoices/invoices.service';
import { Payment } from '../payments/entities/payment.entity';
import { AttendanceService } from '../attendance/attendance.service';
import { StudentNotificationService } from './student-notification.service';
import { Inject, forwardRef } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class StudentsService { 
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StudentContact)
    private contactRepository: Repository<StudentContact>,
    @InjectRepository(StudentAcademicInfo)
    private academicRepository: Repository<StudentAcademicInfo>,
    @InjectRepository(StudentFinancialInfo)
    private financialRepository: Repository<StudentFinancialInfo>,
    @InjectRepository(BedSwitchAudit)
    private bedSwitchAuditRepository: Repository<BedSwitchAudit>,
    @InjectRepository(LedgerEntry)
    private ledgerRepository: Repository<LedgerEntry>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(RoomOccupant)
    private roomOccupantRepository: Repository<RoomOccupant>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,
    private bedSyncService: BedSyncService,
    private advancePaymentService: AdvancePaymentService,
    private checkoutSettlementService: CheckoutSettlementService,
    private invoicesService: InvoicesService,
    @Inject(forwardRef(() => AttendanceService))
    private attendanceService: AttendanceService,
    private studentNotificationService: StudentNotificationService,
    private dataSource: DataSource,
    private httpService: HttpService,
  ) {
    // super(studentRepository, 'Student'); 
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

    // Debug: Log students found
    console.log(`🔍 StudentsService.findAll - Found ${students.length} students for hostelId: ${hostelId}`);
    console.log(`🔍 Students status breakdown:`, {
      total: students.length,
      pendingConfig: students.filter(s => s.status === StudentStatus.PENDING_CONFIGURATION).length,
      active: students.filter(s => s.status === StudentStatus.ACTIVE).length,
      unconfigured: students.filter(s => !s.isConfigured).length
    });

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

    // Get current financial info (all fee types)
    const baseMonthlyFee = student.financialInfo?.find(f => f.feeType === FeeType.BASE_MONTHLY && f.isActive);
    const laundryFee = student.financialInfo?.find(f => f.feeType === FeeType.LAUNDRY && f.isActive);
    const foodFee = student.financialInfo?.find(f => f.feeType === FeeType.FOOD && f.isActive);
    const wifiFee = student.financialInfo?.find(f => f.feeType === FeeType.UTILITIES && f.isActive);
    const maintenanceFee = student.financialInfo?.find(f => f.feeType === FeeType.MAINTENANCE && f.isActive);

    // Calculate current balance from LedgerV2 (new system)
    // Separate configuration advance from regular payments for accurate invoice calculations
    let currentBalance = 0;
    let advanceBalance = 0;
    let configurationAdvance = 0;
    let totalAdvance = 0;
    
    try {
      // Import LedgerV2Service dynamically to get balance
      const { LedgerV2Service } = await import('../ledger-v2/services/ledger-v2.service');
      const ledgerV2Repository = this.ledgerRepository.manager.getRepository('LedgerEntryV2');
      
      // Get total debits and credits from ledger (this is the SOURCE OF TRUTH for balance)
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

      // Calculate current balance from ledger (SOURCE OF TRUTH)
      currentBalance = netBalance > 0 ? netBalance : 0; // Dues
      const totalAdvanceFromLedger = netBalance < 0 ? Math.abs(netBalance) : 0;

      // SIMPLIFIED: No configuration advance - all advance is regular advance
      // Since configuration advance is no longer created, all advance is regular advance
      advanceBalance = totalAdvanceFromLedger;
      configurationAdvance = 0; // No longer used
      totalAdvance = totalAdvanceFromLedger;

    } catch (error) {
      console.error('Error calculating balance from LedgerV2:', error);
      // Fallback to 0 if error
      currentBalance = 0;
      advanceBalance = 0;
      configurationAdvance = 0;
      totalAdvance = 0;
    }

    // Return EXACT same structure as current JSON with NEW balance breakdown fields
    return {
      id: student.id,
      userId: student.userId, // Include userId for notifications
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
      wifiFee: wifiFee?.amount || 0,              // WiFi/Utilities fee
      maintenanceFee: maintenanceFee?.amount || 0, // Maintenance fee
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      currentBalance,          // Dues (from regular invoices vs regular payments)
      advanceBalance,          // Regular advance (from extra regular payments)
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

      // PHASE 1: FINANCIAL INTEGRATION - Get current balance from LedgerV2Service
      let currentBalance = { currentBalance: 0, balanceType: 'Cr' };
      try {
        // Import LedgerV2Service dynamically to avoid circular dependency
        const { LedgerV2Service } = await import('../ledger-v2/services/ledger-v2.service');
        const ledgerV2Repository = queryRunner.manager.getRepository('LedgerEntryV2');
        const ledgerV2Service = new LedgerV2Service(
          ledgerV2Repository as any,
          queryRunner.manager.getRepository('Student') as any,
          queryRunner.manager.getRepository('Payment') as any,
          queryRunner.manager.getRepository('Invoice') as any,
          null as any, // transactionService - will handle manually
          null as any  // calculationService - will handle manually
        );
        
        currentBalance = await ledgerV2Service.getStudentBalance(studentId, hostelId);
        console.log(` Current balance for ${student.name}: NPR ${currentBalance.currentBalance} (${currentBalance.balanceType})`);
      } catch (error) {
        console.warn(' Could not fetch balance from LedgerV2Service, using fallback calculation');
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

      // PHASE 1: FINANCIAL INTEGRATION - Create ledger entries for checkout settlement
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
        
        console.log(` Created refund entry: NPR ${refundAmount} for ${student.name}`);
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
        
        console.log(` Created deduction entry: NPR ${deductionAmount} for ${student.name}`);
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

      // PHASE 2: HISTORICAL TRACKING - Update RoomOccupant with checkout date
      await this.updateRoomOccupancyHistory(queryRunner, studentId, checkoutDetails.checkoutDate);

      // ENHANCED BED RELEASE - Update booking-guest status and free up the bed
      await this.releaseBedAndUpdateBooking(queryRunner, student, checkoutDetails);

      // Commit transaction for basic checkout operations
      await queryRunner.commitTransaction();

      // NEPALESE BILLING: Calculate accurate settlement (outside transaction)
      let accurateSettlement = null;
      try {
        const settlementResult = await this.checkoutSettlementService.processCheckoutSettlement(
          studentId,
          checkoutDetails.checkoutDate || new Date().toISOString().split('T')[0],
          hostelId,
          checkoutDetails.notes
        );
        accurateSettlement = settlementResult.settlement;
        console.log(` Accurate settlement processed: ${settlementResult.message}`);
      } catch (error) {
        console.error(' Settlement calculation failed:', error);
        // Don't fail checkout if settlement calculation fails
      }

      // RECENT ACTIVITIES - Log checkout activity
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

      console.log(` Checkout completed for ${student.name}:`);
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
      console.error(' Checkout transaction failed:', error);
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

  async configureStudent(studentId: string, configData: any, hostelId: string, adminJwt?: JwtPayload) {
    console.log(`🔧 CONFIGURE STUDENT START - ID: ${studentId}`);
    console.log(`🔧 AdminJwt received:`, adminJwt ? { id: adminJwt.id, businessId: adminJwt.businessId } : 'NULL');
    
    const student = await this.findOne(studentId, hostelId);
    console.log(`🔧 Student found:`, { id: student.id, name: student.name, userId: student.userId });

    // PROTECTION: Prevent re-configuration if student is already configured
    if (student.isConfigured) {
      throw new BadRequestException('Student is already configured. Use update endpoint to modify configuration.');
    }

    // CRITICAL FIX: Save guardian information
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

    // CRITICAL FIX: Save academic information
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

    // NEW: Store additional charges as recurring monthly fees
    if (configData.additionalCharges && configData.additionalCharges.length > 0) {
      const validAdditionalCharges = configData.additionalCharges.filter(
        charge => charge.description && charge.description.trim() !== '' && charge.amount > 0
      );

      for (const charge of validAdditionalCharges) {
        financialEntries.push({
          studentId,
          feeType: FeeType.ADDITIONAL,
          amount: charge.amount,
          effectiveFrom: new Date(),
          isActive: true,
          notes: charge.description // Store description in notes field
        });
      }
    }

    // Save financial entries
    if (financialEntries.length > 0) {
      await this.financialRepository.save(financialEntries);
    }

    // Create admin charges for additional charges
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
      
      console.log(` Immediate invoice generated: NPR ${feeCalculation.totalMonthlyFee.toLocaleString()} for period ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`);
    } catch (error) {
      console.error(' Failed to generate immediate invoice:', error);
      throw new BadRequestException(`Configuration failed: ${error.message}`);
    }

    // CONFIGURATION AMOUNT IS NOW PURE CONFIGURATION - NO PAYMENT RECORD CREATED
    // The monthly fee amount is stored only in student_financial_info table
    // No advance payment record is created during configuration
    const feeCalculation = await this.advancePaymentService.calculateMonthlyFee(studentId);
    const totalMonthlyFee = feeCalculation.totalMonthlyFee;
    
    console.log(` Student configured with monthly fee: NPR ${totalMonthlyFee.toLocaleString()}`);
    console.log(`   - Breakdown:`, feeCalculation.breakdown.map(b => `${b.description}: ${b.amount}`).join(', '));
    console.log(`   - Configuration amount stored in financial info only - no payment record created`);
    console.log(`   - Student will pay this amount later as regular payments`);
    
    // No advancePaymentRecord created - configuration amount is pure configuration
    let advancePaymentRecord = null;

    // Mark student as configured and active
    await this.studentRepository.update(studentId, {
      isConfigured: true,
      status: StudentStatus.ACTIVE
    });

    // 🔧 UNIVERSAL FIX: Update bed status from RESERVED to OCCUPIED
    // Works for both manual students and booking-based students
    try {
      let bed = null;
      
      // Method 1: Try to find bed by currentOccupantId (works for manual students)
      bed = await this.bedRepository.findOne({
        where: { currentOccupantId: studentId }
      });
      
      // Method 2: If not found, try by bedIdentifier + roomId (fallback)
      if (!bed && student.bedNumber && student.roomId) {
        bed = await this.bedRepository.findOne({
          where: { 
            roomId: student.roomId,
            bedIdentifier: student.bedNumber
          }
        });
      }
      
      // Method 3: If still not found, find any RESERVED bed in the student's room
      if (!bed && student.roomId) {
        bed = await this.bedRepository.findOne({
          where: { 
            roomId: student.roomId,
            status: BedStatus.RESERVED
          }
        });
      }

      if (bed) {
        await this.bedRepository.update(bed.id, {
          status: BedStatus.OCCUPIED,
          currentOccupantId: studentId,  // Ensure correct occupant ID
          currentOccupantName: student.name
        });
        console.log(`✅ Bed ${bed.bedIdentifier} status updated: RESERVED → OCCUPIED for student ${student.name}`);
        console.log(`   - Method used: ${bed.currentOccupantId === studentId ? 'currentOccupantId' : 'bedIdentifier/roomId'}`);
      } else {
        console.error(`❌ No suitable bed found for student ${student.name} (ID: ${studentId})`);
        console.error(`   - Student roomId: ${student.roomId}`);
        console.error(`   - Student bedNumber: ${student.bedNumber}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update bed status for student ${studentId}:`, error);
      // Don't fail configuration if bed update fails
    }

    // Get final calculation for response (reuse the calculation from above)
    const finalFeeCalculation = feeCalculation;

    // AUTO CHECK-IN: Create initial check-in after configuration
    try {
      await this.attendanceService.createInitialCheckIn(studentId, hostelId);
      console.log(` Initial check-in created for student ${studentId}`);
    } catch (error) {
      console.error(' Failed to create initial check-in:', error);
      // Don't fail configuration if check-in fails
      console.warn(' Configuration completed but initial check-in failed');
    }

    const result = {
      success: true,
      message: 'Student configuration completed successfully - fees configured, invoice generated',
      studentId,
      configurationDate,
      totalMonthlyFee,
      feeBreakdown: finalFeeCalculation.breakdown,
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
      },
      configurationAmount: {
        monthlyFee: totalMonthlyFee,
        breakdown: finalFeeCalculation.breakdown,
        storedInFinancialInfo: true,
        noPaymentRecordCreated: true,
        note: 'Configuration amount is stored in financial info only - no payment record created'
      }
    };

    // 🆕 NEW: Send notification to student about configuration completion
    console.log(`🔔 CHECKING NOTIFICATION CONDITIONS:`);
    console.log(`   - adminJwt exists: ${!!adminJwt}`);
    console.log(`   - student.userId exists: ${!!student.userId}`);
    console.log(`   - student.name: ${student.name}`);
    
    if (adminJwt && student?.userId) {
      try {
        console.log(`📱 STARTING CONFIGURATION NOTIFICATION for ${student.name}`);
        this.logger.log(`📱 Sending configuration notification to student ${student.name}`);
        await this.studentNotificationService.notifyStudentOfConfiguration(student, result, adminJwt);
        console.log(`✅ CONFIGURATION NOTIFICATION COMPLETED SUCCESSFULLY`);
        this.logger.log(`✅ Configuration notification sent successfully`);
      } catch (notifError) {
        console.log(`❌ CONFIGURATION NOTIFICATION FAILED: ${notifError.message}`);
        this.logger.warn(`⚠️ Failed to send configuration notification: ${notifError.message}`);
        // Don't let notification failure cause configuration rollback
      }
    } else {
      console.log(`⚠️ SKIPPING NOTIFICATION - Missing adminJwt or student.userId`);
    }

    return result;
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
   * PHASE 2: HISTORICAL TRACKING - Update room occupancy with checkout date
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

        console.log(` Updated room occupancy history for student ${studentId} - checkout date: ${checkoutDateValue.toISOString().split('T')[0]}`);
      } else {
        console.warn(` No active room occupancy found for student ${studentId}`);
      }
    } catch (error) {
      console.error(' Error updating room occupancy history:', error);
      // Don't fail the entire checkout, but log the error
    }
  }

  /**
   * ENHANCED BED RELEASE - Robust bed release with multiple lookup strategies
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
              console.log(` Bed ${bookingGuest.bed_id} freed up for student ${student.name} using BedSyncService`);
            } catch (error) {
              console.error(' Error in BedSyncService:', error);
            }
          }, 1000);
        }

        console.log(` Updated booking guest ${bookingGuest.id} to CHECKED_OUT status`);
      } else {
        console.warn(` No booking guest found for student ${student.name} during checkout`);
      }
    } catch (error) {
      console.error(' Error updating bed availability during checkout:', error);
      // Don't fail the entire checkout process, but log the error
    }
  }

  /**
   * RECENT ACTIVITIES - Log checkout activity for dashboard
   */
  private async logCheckoutActivity(student: any, initialBalance: number, netSettlement: number) {
    try {
      // The dashboard service already picks up checkout activities by looking for INACTIVE students
      // with recent updatedAt timestamps, so we don't need to create a separate activity record.
      // The student status update to INACTIVE with updatedAt will automatically appear in recent activities.
      
      console.log(` Checkout activity will appear in dashboard for student: ${student.name}`);
      console.log(`   - Initial balance: NPR ${initialBalance}`);
      console.log(`   - Net settlement: NPR ${netSettlement}`);
      console.log(`   - Activity will be picked up by dashboard service automatically`);
      
      // Optional: If you want to create a specific activity log entry, you could add it here
      // But the current dashboard service already handles this by monitoring student status changes
      
    } catch (error) {
      console.error(' Error logging checkout activity:', error);
      // Don't fail checkout for logging errors
    }
  }

  /**
   * NEPALESE BILLING: Get payment status for student
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
   * NEPALESE BILLING: Calculate checkout settlement
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
   * BILLING TIMELINE: Get billing timeline with pagination
   * Shows past events, current status, and upcoming billing cycles
   */
  async getConfigurationBillingTimelinePaginated(
    page: number = 1,
    limit: number = 10,
    hostelId: string
  ) {
    try {
      // Get full timeline
      const fullTimeline = await this.getConfigurationBillingTimeline(hostelId);
      
      // Combine all events for pagination
      const allEvents = [
        ...fullTimeline.upcoming,
        ...fullTimeline.today,
        ...fullTimeline.past
      ];
      
      // Calculate pagination
      const total = allEvents.length;
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;
      const paginatedEvents = allEvents.slice(skip, skip + limit);
      
      // Separate back into categories
      const paginatedPast = paginatedEvents.filter(e => e.status === 'PAST');
      const paginatedToday = paginatedEvents.filter(e => e.status === 'TODAY');
      const paginatedUpcoming = paginatedEvents.filter(e => e.status === 'UPCOMING');
      
      return {
        past: paginatedPast,
        today: paginatedToday,
        upcoming: paginatedUpcoming,
        summary: fullTimeline.summary,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting paginated billing timeline:', error);
      throw new BadRequestException(`Failed to get billing timeline: ${error.message}`);
    }
  }

  /**
   * Get student advance balance from ledger
   */
  private async getStudentAdvanceBalance(studentId: string, hostelId: string): Promise<number> {
    try {
      // Import LedgerV2Service dynamically to avoid circular dependency
      const { LedgerV2Service } = await import('../ledger-v2/services/ledger-v2.service');
      const ledgerV2Repository = this.studentRepository.manager.getRepository('LedgerEntryV2');
      
      // Get current balance from ledger
      const balanceResult = await ledgerV2Repository
        .createQueryBuilder('ledger')
        .select('SUM(ledger.credit) - SUM(ledger.debit)', 'netBalance')
        .where('ledger.studentId = :studentId', { studentId })
        .andWhere('ledger.hostelId = :hostelId', { hostelId })
        .andWhere('ledger.isReversed = :isReversed', { isReversed: false })
        .getRawOne();
      
      const netBalance = parseFloat(balanceResult?.netBalance) || 0;
      return netBalance < 0 ? Math.abs(netBalance) : 0; // Return advance as positive number
    } catch (error) {
      console.error('Error getting student advance balance:', error);
      return 0;
    }
  }

  /**
   * BILLING TIMELINE: Get billing timeline for configuration-based billing (Legacy - no pagination)
   * Shows past events, current status, and upcoming billing cycles
   */
  async getConfigurationBillingTimeline(hostelId: string) {
    try {
      const timeline: any[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Safe date formatter
      const formatDate = (date: any): string | null => {
        if (!date) return null;
        try {
          if (date instanceof Date) return date.toISOString();
          if (typeof date === 'string' || typeof date === 'number') {
            const d = new Date(date);
            return isNaN(d.getTime()) ? null : d.toISOString();
          }
          return null;
        } catch {
          return null;
        }
      };

      // Get all configured students
      const students = await this.studentRepository.find({
        where: { hostelId, isConfigured: true },
        order: { enrollmentDate: 'DESC' }
      });

      // Add configuration events (past)
      for (const student of students) {
        if (student.enrollmentDate) {
          const configDate = new Date(student.enrollmentDate);
          configDate.setHours(0, 0, 0, 0);
          
          timeline.push({
            id: `config-${student.id}`,
            date: configDate.toISOString(),
            type: 'CONFIGURATION',
            status: configDate < today ? 'PAST' : configDate.getTime() === today.getTime() ? 'TODAY' : 'UPCOMING',
            title: `${student.name} configured`,
            description: `Student configuration completed`,
            studentName: student.name,
            metadata: { studentId: student.id }
          });
        }
      }

      // Get recent invoices (limit for perf). Note: findAll returns { items, pagination }
      const recentInvoices = await this.invoicesService.findAll(
        { limit: 100 },
        hostelId
      );

      // Add invoice events
      const invoiceItems: any[] = Array.isArray(recentInvoices?.items)
        ? recentInvoices.items
        : (Array.isArray(recentInvoices) ? recentInvoices : []);

      for (const invoice of invoiceItems) {
        // Prefer createdAt; fallback to periodStart or configurationDate
        const iso = formatDate(invoice.createdAt) || formatDate(invoice.periodStart) || formatDate(invoice.configurationDate);
        if (!iso) continue; // skip if no valid date
        const invoiceDate = new Date(iso);
        invoiceDate.setHours(0, 0, 0, 0);

        const status = invoiceDate < today
          ? 'PAST'
          : invoiceDate.getTime() === today.getTime() ? 'TODAY' : 'UPCOMING';

        timeline.push({
          id: `invoice-${invoice.id}`,
          date: invoiceDate.toISOString(),
          type: 'INVOICE_GENERATED',
          status,
          title: `Invoice generated - ${invoice.studentName || 'Student'}`,
          // Avoid toLocaleString on server; keep number raw and concise text
          description: `Amount NPR ${Number(invoice.total || 0)} for period ${invoice.periodLabel || invoice.month || ''}`.trim(),
          amount: Number(invoice.total || 0),
          studentName: invoice.studentName,
          metadata: { invoiceId: invoice.id }
        });
      }

      // Calculate upcoming billing cycles with advance balance information
      const upcomingBillingDates = new Map<string, any[]>();
      
      for (const student of students) {
        if (student.enrollmentDate) {
          const configDate = new Date(student.enrollmentDate);
          
          // Calculate next 2 billing cycles
          for (let i = 1; i <= 2; i++) {
            const nextBillingDate = new Date(configDate);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + i);
            nextBillingDate.setHours(0, 0, 0, 0);
            
            if (nextBillingDate > today) {
              const dateKey = nextBillingDate.toISOString().split('T')[0];
              
              if (!upcomingBillingDates.has(dateKey)) {
                upcomingBillingDates.set(dateKey, []);
              }
              
              // Get advance balance and monthly fee for this student
              const [advanceBalance, monthlyFee] = await Promise.all([
                this.getStudentAdvanceBalance(student.id, hostelId),
                this.advancePaymentService.calculateMonthlyFee(student.id).then(result => result.totalMonthlyFee)
              ]);
              
              const billingInfo = {
                ...student,
                advanceBalance,
                monthlyFee,
                needsPayment: advanceBalance < monthlyFee,
                monthsCovered: Math.floor(advanceBalance / monthlyFee)
              };
              
              upcomingBillingDates.get(dateKey)!.push(billingInfo);
            }
          }
        }
      }

      // Add upcoming billing cycle events with enhanced advance balance information
      for (const [dateKey, studentsInCycle] of upcomingBillingDates.entries()) {
        const billingDate = new Date(dateKey);
        const daysUntil = Math.ceil((billingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate coverage statistics
        const studentsNeedingPayment = studentsInCycle.filter(s => s.needsPayment).length;
        const studentsCoveredByAdvance = studentsInCycle.length - studentsNeedingPayment;
        const totalMonthlyFees = studentsInCycle.reduce((sum, s) => sum + s.monthlyFee, 0);
        const totalAdvanceCovered = studentsInCycle
          .filter(s => !s.needsPayment)
          .reduce((sum, s) => sum + s.monthlyFee, 0);
        const netAmountDue = totalMonthlyFees - totalAdvanceCovered;
        
        // Create enhanced description
        let description = `${studentsInCycle.length} invoice${studentsInCycle.length > 1 ? 's' : ''} will be generated`;
        if (studentsCoveredByAdvance > 0) {
          description += ` (${studentsCoveredByAdvance} covered by advance)`;
        }
        
        timeline.push({
          id: `billing-${dateKey}`,
          date: billingDate.toISOString(),
          type: 'UPCOMING_BILLING',
          status: 'UPCOMING',
          title: `Next billing cycle (${daysUntil} days)`,
          description,
          metadata: { 
            studentCount: studentsInCycle.length,
            studentsNeedingPayment,
            studentsCoveredByAdvance,
            totalMonthlyFees,
            totalAdvanceCovered,
            netAmountDue,
            daysUntil,
            students: studentsInCycle.map(s => ({
              id: s.id,
              name: s.name,
              monthlyFee: s.monthlyFee,
              advanceBalance: s.advanceBalance,
              needsPayment: s.needsPayment,
              monthsCovered: s.monthsCovered,
              status: s.needsPayment ? 'payment_needed' : 'covered_by_advance'
            }))
          }
        });
      }

      // Sort timeline by date (most recent first for past, nearest first for upcoming)
      timeline.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        if (a.status === 'UPCOMING' && b.status === 'UPCOMING') {
          return dateA - dateB; // Ascending for upcoming
        }
        return dateB - dateA; // Descending for past
      });

      // Group by status
      const pastEvents = timeline.filter(e => e.status === 'PAST').slice(0, 10); // Last 10 events
      const todayEvents = timeline.filter(e => e.status === 'TODAY');
      const upcomingEvents = timeline.filter(e => e.status === 'UPCOMING').slice(0, 5); // Next 5 events

      return {
        past: pastEvents,
        today: todayEvents,
        upcoming: upcomingEvents,
        summary: {
          totalEvents: timeline.length,
          pastEventsCount: pastEvents.length,
          upcomingEventsCount: upcomingEvents.length,
          nextBillingDate: upcomingEvents.find(e => e.type === 'UPCOMING_BILLING')?.date || null
        }
      };
    } catch (error) {
      console.error('Error getting billing timeline:', error);
      throw new BadRequestException(`Failed to get billing timeline: ${error.message}`);
    }
  }

  /**
   * 👁️ CHECKOUT PREVIEW: Get simplified checkout preview without detailed financial information
   * Shows essential checkout information only
   */
  async getCheckoutPreview(studentId: string, hostelId: string) {
    try {
      // Get student details
      const student = await this.studentRepository.findOne({
        where: { id: studentId, hostelId },
        relations: ['room']
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Get outstanding invoices for final settlement calculation only
      const outstandingInvoices = await this.invoicesService.getOutstandingDues(studentId, hostelId);
      const totalDues = outstandingInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

      // Get advance payments for final settlement calculation only
      const advancePayments = await this.paymentRepository.find({
        where: {
          studentId,
          paymentType: 'ADVANCE' as any,
          status: 'Completed' as any
        }
      });
      const totalAdvance = advancePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      // Calculate final settlement amount only
      const finalAmount = totalDues - totalAdvance;

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

      // Return simplified checkout preview - no detailed financial breakdown
      return {
        studentId: student.id,
        studentName: student.name,
        roomNumber: student.room?.roomNumber || 'Not assigned',
        enrollmentDate: formatDate(student.enrollmentDate),
        finalSettlement: Math.round(finalAmount * 100) / 100,
        settlementStatus: finalAmount > 0 ? 'Outstanding' : finalAmount < 0 ? 'Refund Due' : 'Settled'
      };
    } catch (error) {
      console.error('Error getting checkout preview:', error);
      throw new BadRequestException(`Failed to get checkout preview: ${error.message}`);
    }
  }

  /**
   * BED SWITCH - Switch student to different bed with full financial integrity
   * Uses same transaction pattern as processCheckout()
   */
  async switchBed(studentId: string, switchBedDto: SwitchBedDto, hostelId: string) {
    console.log(` Starting bed switch for student ${studentId} to bed ${switchBedDto.newBedId}`);

    // Validate hostelId
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const queryRunner = this.studentRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // STEP 1: Validate student and get current state
      const student = await queryRunner.manager.findOne(Student, {
        where: { id: studentId, hostelId },
        relations: ['room', 'financialInfo']
      });

      if (!student) {
        throw new NotFoundException(`Student ${studentId} not found`);
      }

      if (student.status !== StudentStatus.ACTIVE) {
        throw new BadRequestException('Only active students can switch beds');
      }

      // STEP 2: Get current bed
      const currentBed = await queryRunner.manager.findOne(Bed, {
        where: { currentOccupantId: studentId },
        relations: ['room']
      });

      if (!currentBed) {
        throw new NotFoundException('Current bed assignment not found for student');
      }

      // STEP 3: Get target bed and validate
      const targetBed = await queryRunner.manager.findOne(Bed, {
        where: { id: switchBedDto.newBedId, hostelId },
        relations: ['room']
      });

      if (!targetBed) {
        throw new NotFoundException(`Target bed ${switchBedDto.newBedId} not found`);
      }

      if (targetBed.status !== BedStatus.AVAILABLE) {
        throw new BadRequestException(`Target bed is not available (status: ${targetBed.status})`);
      }

      if (currentBed.id === targetBed.id) {
        throw new BadRequestException('Student is already in this bed');
      }

      // STEP 4: Get financial data before switch
      const oldBalance = await this.calculateLedgerBalance(studentId);
      const oldRate = currentBed.monthlyRate || 0;
      const newRate = targetBed.monthlyRate || 0;
      const rateDifference = newRate - oldRate;
      const rateChanged = Math.abs(rateDifference) > 0.01;
      const effectiveDate = switchBedDto.effectiveDate ? new Date(switchBedDto.effectiveDate) : new Date();

      console.log(` Rate comparison: Old=${oldRate}, New=${newRate}, Difference=${rateDifference}, Changed=${rateChanged}`);

      // STEP 5: Update financial info if rate changed
      if (rateChanged) {
        // Deactivate old base_monthly entry
        await queryRunner.manager.update(
          StudentFinancialInfo,
          { studentId, feeType: FeeType.BASE_MONTHLY, isActive: true },
          { isActive: false, effectiveTo: effectiveDate }
        );

        // Create new base_monthly entry
        await queryRunner.manager.save(StudentFinancialInfo, {
          studentId,
          feeType: FeeType.BASE_MONTHLY,
          amount: newRate,
          effectiveFrom: effectiveDate,
          isActive: true,
          notes: `Rate updated due to bed switch from ${currentBed.bedIdentifier} (${oldRate}) to ${targetBed.bedIdentifier} (${newRate})`
        });

        // Create ledger adjustment entry
        await queryRunner.manager.save(LedgerEntry, {
          studentId,
          hostelId,
          date: effectiveDate,
          type: LedgerEntryType.ADJUSTMENT,
          balanceType: rateDifference > 0 ? BalanceType.DR : BalanceType.CR,
          debit: rateDifference > 0 ? Math.abs(rateDifference) : 0,
          credit: rateDifference < 0 ? Math.abs(rateDifference) : 0,
          description: `Bed switch rate adjustment: ${oldRate} → ${newRate} (${rateDifference > 0 ? '+' : ''}${rateDifference})`,
          isReversed: false
        });

        console.log(` Financial info updated with new rate: ${newRate}`);
      }

      // STEP 6: Update student record
      await queryRunner.manager.update(Student, studentId, {
        roomId: targetBed.roomId,
        bedNumber: targetBed.bedNumber
      });

      // STEP 7: Update bed occupancy
      // Clear old bed
      await queryRunner.manager.update(Bed, currentBed.id, {
        status: BedStatus.AVAILABLE,
        currentOccupantId: null,
        currentOccupantName: null,
        occupiedSince: null,
        notes: `Released by ${student.name} on ${effectiveDate.toISOString().split('T')[0]} (bed switch)`
      });

      // Assign new bed
      await queryRunner.manager.update(Bed, targetBed.id, {
        status: BedStatus.OCCUPIED,
        currentOccupantId: studentId,
        currentOccupantName: student.name,
        occupiedSince: effectiveDate,
        notes: `Assigned to ${student.name} via bed switch on ${effectiveDate.toISOString().split('T')[0]}`
      });

      // STEP 8: Update room occupancy history
      // Close old occupancy
      await queryRunner.manager
        .createQueryBuilder()
        .update(RoomOccupant)
        .set({ check_out_date: effectiveDate, status: 'Transferred' })
        .where('studentId = :studentId', { studentId })
        .andWhere('check_out_date IS NULL')
        .execute();

      // Create new occupancy
      await queryRunner.manager.save(RoomOccupant, {
        studentId,
        roomId: targetBed.roomId,
        bedId: targetBed.id,
        checkInDate: effectiveDate,
        status: 'Active'
      });

      // STEP 9: Calculate new balance and create audit record
      const newBalance = await this.calculateLedgerBalance(studentId);
      const advanceAdjustment = rateChanged ? (oldBalance - newBalance) : 0;

      const audit = await queryRunner.manager.save(BedSwitchAudit, {
        studentId,
        fromBedId: currentBed.id,
        toBedId: targetBed.id,
        fromRoomId: currentBed.roomId,
        toRoomId: targetBed.roomId,
        oldRate,
        newRate,
        rateDifference,
        oldBalance,
        newBalance,
        advanceAdjustment,
        switchDate: effectiveDate,
        reason: switchBedDto.reason || 'Bed switch',
        approvedBy: switchBedDto.approvedBy,
        financialSnapshot: {
          student: { id: student.id, name: student.name },
          oldBed: { id: currentBed.id, identifier: currentBed.bedIdentifier, rate: oldRate },
          newBed: { id: targetBed.id, identifier: targetBed.bedIdentifier, rate: newRate },
          rateChanged,
          effectiveDate: effectiveDate.toISOString()
        }
      });

      // STEP 10: Commit transaction
      await queryRunner.commitTransaction();

      console.log(` Bed switch completed successfully: ${currentBed.bedIdentifier} → ${targetBed.bedIdentifier}`);

      // STEP 11: Async operations (after commit)
      setImmediate(async () => {
        try {
          // Sync room occupancy counts
          await this.bedSyncService.updateRoomOccupancyFromBeds(currentBed.roomId);
          await this.bedSyncService.updateRoomOccupancyFromBeds(targetBed.roomId);
          console.log(` Room occupancy synced for both rooms`);
        } catch (error) {
          console.warn(` Failed to sync room occupancy: ${error.message}`);
        }
      });

      // Return comprehensive result
      return {
        success: true,
        message: `Successfully switched ${student.name} from ${currentBed.bedIdentifier} to ${targetBed.bedIdentifier}`,
        bedSwitch: {
          studentId,
          studentName: student.name,
          fromBed: {
            id: currentBed.id,
            identifier: currentBed.bedIdentifier,
            roomNumber: currentBed.room?.roomNumber,
            rate: oldRate
          },
          toBed: {
            id: targetBed.id,
            identifier: targetBed.bedIdentifier,
            roomNumber: targetBed.room?.roomNumber,
            rate: newRate
          },
          rateChange: {
            changed: rateChanged,
            oldRate,
            newRate,
            difference: rateDifference
          },
          balanceImpact: {
            oldBalance,
            newBalance,
            advanceAdjustment
          },
          effectiveDate: effectiveDate.toISOString().split('T')[0],
          auditId: audit.id
        }
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(` Bed switch failed: ${error.message}`);
      throw new BadRequestException(`Bed switch failed: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Helper: Calculate ledger balance for a student
   */
  private async calculateLedgerBalance(studentId: string): Promise<number> {
    const result = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .select('SUM(ledger.debit)', 'totalDebits')
      .addSelect('SUM(ledger.credit)', 'totalCredits')
      .where('ledger.studentId = :studentId', { studentId })
      .andWhere('ledger.isReversed = :isReversed', { isReversed: false })
      .getRawOne();

    const totalDebits = parseFloat(result?.totalDebits || '0');
    const totalCredits = parseFloat(result?.totalCredits || '0');
    return totalDebits - totalCredits;
  }

  // ==================== MANUAL STUDENT CREATION METHODS ====================

  /**
   * Get available floors with bed availability statistics
   */
  async getAvailableFloors(hostelId: string): Promise<FloorSelectionResponseDto[]> {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    const floorStats = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoin('room.beds', 'bed')
      .select('room.floor', 'floorNumber')
      .addSelect('COUNT(DISTINCT room.id)', 'totalRooms')
      .addSelect('COUNT(DISTINCT CASE WHEN bed.status = :availableStatus THEN room.id END)', 'availableRooms')
      .addSelect('COUNT(bed.id)', 'totalBeds')
      .addSelect('COUNT(CASE WHEN bed.status = :availableStatus THEN bed.id END)', 'availableBeds')
      .where('room.hostelId = :hostelId', { hostelId })
      .andWhere('room.status = :status', { status: 'ACTIVE' })
      .andWhere('room.floor IS NOT NULL')
      .setParameter('availableStatus', 'Available')
      .groupBy('room.floor')
      .orderBy('room.floor', 'ASC')
      .getRawMany();

    return floorStats.map(stat => ({
      floorNumber: parseInt(stat.floorNumber),
      totalRooms: parseInt(stat.totalRooms),
      availableRooms: parseInt(stat.availableRooms),
      totalBeds: parseInt(stat.totalBeds),
      availableBeds: parseInt(stat.availableBeds)
    }));
  }

  /**
   * Get available rooms on a specific floor
   */
  async getAvailableRoomsOnFloor(hostelId: string, floor: number): Promise<RoomSelectionResponseDto[]> {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    // Query rooms with actual bed counts from beds table (without JSON fields in GROUP BY)
    const roomsWithBedCounts = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoin('room.beds', 'bed')
      .select('room.id', 'roomId')
      .addSelect('room.roomNumber', 'roomNumber')
      .addSelect('room.name', 'name')
      .addSelect('room.floor', 'floor')
      .addSelect('room.monthlyRate', 'monthlyRate')
      .addSelect('room.status', 'status')
      .addSelect('room.gender', 'gender')
      .addSelect('room.description', 'description')
      .addSelect('COUNT(bed.id)', 'totalBeds')
      .addSelect('COUNT(CASE WHEN bed.status = :availableStatus THEN bed.id END)', 'availableBeds')
      .addSelect('COUNT(CASE WHEN bed.status IN (:...occupiedStatuses) THEN bed.id END)', 'occupiedBeds')
      .where('room.hostelId = :hostelId', { hostelId })
      .andWhere('room.floor = :floor', { floor })
      .andWhere('room.status = :roomStatus', { roomStatus: 'ACTIVE' })
      .setParameter('availableStatus', 'Available')
      .setParameter('occupiedStatuses', ['Occupied', 'Reserved'])
      .groupBy('room.id, room.roomNumber, room.name, room.floor, room.monthlyRate, room.status, room.gender, room.description')
      .orderBy('room.roomNumber', 'ASC')
      .getRawMany();

    // Get room images separately to avoid JSON GROUP BY issues
    const roomIds = roomsWithBedCounts.map(room => room.roomId);
    const roomImagesMap = new Map();
    
    if (roomIds.length > 0) {
      const roomsWithImages = await this.roomRepository
        .createQueryBuilder('room')
        .select('room.id', 'roomId')
        .addSelect('room.images', 'images')
        .where('room.id IN (:...roomIds)', { roomIds })
        .getRawMany();
      
      roomsWithImages.forEach(room => {
        roomImagesMap.set(room.roomId, room.images || []);
      });
    }

    // Get amenities separately for each room to avoid complex grouping
    const amenitiesMap = new Map();
    
    if (roomIds.length > 0) {
      const roomAmenities = await this.roomRepository
        .createQueryBuilder('room')
        .leftJoin('room.amenities', 'roomAmenity')
        .leftJoin('roomAmenity.amenity', 'amenity')
        .select('room.id', 'roomId')
        .addSelect('amenity.id', 'amenityId')
        .addSelect('amenity.name', 'amenityName')
        .addSelect('amenity.description', 'amenityDescription')
        .where('room.id IN (:...roomIds)', { roomIds })
        .andWhere('roomAmenity.isActive = :isActive', { isActive: true })
        .getRawMany();

      // Group amenities by room
      roomAmenities.forEach(ra => {
        if (!amenitiesMap.has(ra.roomId)) {
          amenitiesMap.set(ra.roomId, []);
        }
        if (ra.amenityId) {
          amenitiesMap.get(ra.roomId).push({
            id: ra.amenityId,
            name: ra.amenityName,
            description: ra.amenityDescription
          });
        }
      });
    }

    // Filter rooms with available beds and format response
    return roomsWithBedCounts
      .filter(room => parseInt(room.availableBeds) > 0)
      .map(room => ({
        roomId: room.roomId,
        roomNumber: room.roomNumber,
        name: room.name,
        floor: parseInt(room.floor),
        bedCount: parseInt(room.totalBeds),
        occupancy: parseInt(room.occupiedBeds),
        availableBeds: parseInt(room.availableBeds),
        monthlyRate: parseFloat(room.monthlyRate) || 0,
        status: room.status,
        gender: room.gender,
        images: roomImagesMap.get(room.roomId) || [],
        description: room.description,
        amenities: amenitiesMap.get(room.roomId) || []
      }));
  }

  /**
   * Get available beds in a specific room
   */
  async getAvailableBedsInRoom(hostelId: string, roomId: string): Promise<BedSelectionResponseDto[]> {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    // Get ALL beds in the room for debugging, not just available ones
    const beds = await this.bedRepository.find({
      where: {
        roomId,
        hostelId
      },
      relations: ['room'],
      order: { bedNumber: 'ASC' }
    });

    console.log(` Found ${beds.length} beds in room ${roomId}`);
    beds.forEach(bed => {
      console.log(` Bed ${bed.bedIdentifier}: status="${bed.status}" (type: ${typeof bed.status})`);
    });

    return beds.map(bed => ({
      bedId: bed.id,
      bedNumber: bed.bedNumber,
      bedIdentifier: bed.bedIdentifier,
      status: bed.status,
      monthlyRate: bed.monthlyRate || 0,
      description: bed.description,
      room: {
        roomId: bed.room.id,
        roomNumber: bed.room.roomNumber,
        floor: bed.room.floor
      }
    }));
  }

  /**
   * Generate random userId for manual student creation
   */
  private generateRandomUserId(): string {
    return uuidv4();
  }

  /**
   * Create student manually with bed assignment
   */
  async createManualStudent(dto: CreateManualStudentDto, hostelId: string, businessId: string): Promise<any> {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for this operation.');
    }

    if (!businessId) {
      throw new BadRequestException('Business ID required for user creation.');
    }

    try {
      return await this.dataSource.transaction(async manager => {
        // 1. Validate bed is available
        const bed = await manager.findOne(Bed, {
          where: { id: dto.bedId, status: BedStatus.AVAILABLE },
          relations: ['room']
        });

        if (!bed) {
          throw new BadRequestException('Selected bed is not available');
        }

        if (bed.hostelId !== hostelId) {
          throw new BadRequestException('Bed does not belong to this hostel');
        }

        // 2. Check if student with same email exists globally (across all hostels)
        const existingEmailStudent = await manager.findOne(Student, {
          where: { email: dto.email },
          relations: ['hostel']
        });

        if (existingEmailStudent) {
          if (existingEmailStudent.hostelId === hostelId) {
            throw new BadRequestException(`A student with email "${dto.email}" already exists in this hostel`);
          } else {
            throw new BadRequestException(`A student with email "${dto.email}" already exists in another hostel (${existingEmailStudent.hostel?.name || 'Unknown Hostel'}). Each email can only be used once across the entire system.`);
          }
        }

        // 3. Check if student with same phone exists globally (across all hostels)
        const existingPhoneStudent = await manager.findOne(Student, {
          where: { phone: dto.phone },
          relations: ['hostel']
        });

        if (existingPhoneStudent) {
          if (existingPhoneStudent.hostelId === hostelId) {
            throw new BadRequestException(`A student with phone "${dto.phone}" already exists in this hostel`);
          } else {
            throw new BadRequestException(`A student with phone "${dto.phone}" already exists in another hostel (${existingPhoneStudent.hostel?.name || 'Unknown Hostel'}). Each phone number can only be used once across the entire system.`);
          }
        }

      // 3. Get real userId by finding or creating user via Kaha API
      // Pass email, name, and businessId - kaha-main will create user if not found
      console.log(`🏨 Using businessId: ${businessId} for user creation`);
      
      const userId = await this.getRealUserId(
        dto.phone,
        dto.email,           // optional - for user creation
        dto.name,            // optional - for user creation
        businessId           // required - hostel context (from JWT)
      );
      console.log(`🔍 Manual creation - Real userId for phone ${dto.phone}: ${userId}`);

      // 5. Create student with PENDING_CONFIGURATION status
      const student = manager.create(Student, {
        userId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        enrollmentDate: dto.checkInDate ? new Date(dto.checkInDate) : new Date(),
        status: StudentStatus.PENDING_CONFIGURATION,
        isConfigured: false,
        roomId: bed.roomId,
        bedNumber: bed.bedIdentifier,
        hostelId
      });

      const savedStudent = await manager.save(Student, student);

      // 6. Reserve the bed (not occupied yet - that happens during configuration)
      await manager.update(Bed, bed.id, {
        status: BedStatus.RESERVED,
        currentOccupantId: savedStudent.id,
        currentOccupantName: savedStudent.name,
        occupiedSince: dto.checkInDate ? new Date(dto.checkInDate) : new Date(),
        notes: `Reserved for manual student: ${savedStudent.name}`
      });

      // 7. After student configuration completes, update bed status to OCCUPIED
      await manager.update(Bed, bed.id, {
        status: BedStatus.OCCUPIED,
        notes: `Occupied by ${savedStudent.name} after configuration`
      });

      // 8. Create RoomOccupant record
      const roomOccupant = manager.create(RoomOccupant, {
        roomId: bed.roomId,
        studentId: savedStudent.id,
        checkInDate: dto.checkInDate ? new Date(dto.checkInDate) : new Date(),
        bedNumber: bed.bedIdentifier,
        status: 'Active',
        assignedBy: 'manual-admin',
        notes: `Manually created student: ${savedStudent.name}`
      });

      await manager.save(RoomOccupant, roomOccupant);

      // 9. Update room occupancy
      await manager.increment(Room, { id: bed.roomId }, 'occupancy', 1);

      // 10. Save optional information if provided
      if (dto.guardianName || dto.guardianPhone) {
        const guardianContact = manager.create(StudentContact, {
          studentId: savedStudent.id,
          type: ContactType.GUARDIAN,
          name: dto.guardianName,
          phone: dto.guardianPhone,
          isPrimary: true,
          isActive: true
        });
        await manager.save(StudentContact, guardianContact);
      }

      if (dto.emergencyContact) {
        const emergencyContactRecord = manager.create(StudentContact, {
          studentId: savedStudent.id,
          type: ContactType.EMERGENCY,
          phone: dto.emergencyContact,
          isPrimary: true,
          isActive: true
        });
        await manager.save(StudentContact, emergencyContactRecord);
      }

      if (dto.course || dto.institution) {
        const academicInfo = manager.create(StudentAcademicInfo, {
          studentId: savedStudent.id,
          course: dto.course,
          institution: dto.institution,
          academicYear: new Date().getFullYear().toString(),
          isActive: true
        });
        await manager.save(StudentAcademicInfo, academicInfo);
      }

        // Return the created student in API format
        return this.transformToApiResponse(savedStudent);
      });
    } catch (error) {
      console.error('❌ Error creating manual student:', error);
      
      // Handle database constraint violations
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        if (error.message?.includes('email')) {
          throw new BadRequestException(`A student with email "${dto.email}" already exists. Each email can only be used once across the entire system.`);
        } else if (error.message?.includes('phone')) {
          throw new BadRequestException(`A student with phone "${dto.phone}" already exists. Each phone number can only be used once across the entire system.`);
        } else {
          throw new BadRequestException('A student with this email or phone already exists in the system.');
        }
      }
      
      // Re-throw BadRequestExceptions (our validation errors)
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Handle other database errors
      throw new BadRequestException('Failed to create student. Please check your input and try again.');
    }
  }

  /**
   * Get real userId by finding or creating user via Kaha API
   * If user not found and email/name/businessId provided, kaha-main will create the user
   * @param phoneNumber - Required phone number
   * @param email - Optional email (for user creation)
   * @param name - Optional name (for user creation)
   * @param businessId - Required businessId for hostel context
   */
  private async getRealUserId(
    phoneNumber: string, 
    email?: string, 
    name?: string, 
    businessId?: string
  ): Promise<string> {
    try {
      console.log(`🔍 Finding or creating user for phone ${phoneNumber}...`);
      
      // Build query parameters for find-or-create endpoint
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (name) params.append('name', name);
      if (businessId) params.append('businessId', businessId);
      
      const queryString = params.toString();
      const url = `https://dev.kaha.com.np/main/api/v3/users/find-or-create/${encodeURIComponent(phoneNumber)}${queryString ? '?' + queryString : ''}`;
      
      console.log(`🌐 API URL: ${url}`);
      
      const response = await firstValueFrom(
        this.httpService.get(url)
      );
      
      if (response.data && response.data.id) {
        console.log(`✅ Found/Created user: ${response.data.fullName} (${response.data.kahaId})`);
        console.log(`   Real userId: ${response.data.id}`);
        return response.data.id;
      } else {
        throw new BadRequestException('Failed to get or create user from Kaha API');
      }
    } catch (error) {
      console.log(`❌ Error finding/creating user for phone ${phoneNumber}: ${error.message}`);
      throw new BadRequestException(`Failed to find or create user: ${error.message}`);
    }
  }

  /**
   * Create student from JWT token - Fetches user data from Kaha API
   * Used for self-registration or admin creating student for a specific user
   * No createData needed - all user info comes from Kaha API
   */
  async createStudentFromToken(
    createData: { name?: string; phone?: string } | null,
    user: JwtPayload,
    hostelId: string
  ): Promise<any> {
    console.log('�🚨🚨 CREA TE-FROM-TOKEN SERVICE METHOD CALLED 🚨🚨🚨');
    console.log('📋 SERVICE: Received createData (should be empty/optional):', createData);
    console.log('� SERVICE:: User JWT payload:', user ? {
      id: user.id,
      kahaId: user.kahaId,
      businessId: user.businessId
    } : 'NULL');
    console.log('🏨 SERVICE: HostelId:', hostelId);
    
    this.logger.log(`Creating student from token - userId: ${user.id}, businessId: ${user.businessId}`);

    try {
      // Step 1: Fetch user data from Kaha API using userId from JWT
      // Pass userIds twice to create an array (Kaha API requirement)
      const kahaApiUrl = `https://dev.kaha.com.np/main/api/v3/users/filter-user-by-ids?userIds=${user.id}&userIds=${user.id}`;
      console.log('🌐 SERVICE: Fetching user data from Kaha API:', kahaApiUrl);
      this.logger.log(`Fetching user data from Kaha API: ${kahaApiUrl}`);

      const response = await firstValueFrom(
        this.httpService.get(kahaApiUrl)
      );

      console.log('🌐 SERVICE: Kaha API response status:', response.status);
      console.log('🌐 SERVICE: Kaha API response data:', JSON.stringify(response.data, null, 2));

      if (!response.data?.data || response.data.data.length === 0) {
        console.log('❌ SERVICE: User not found in Kaha system');
        throw new BadRequestException('User not found in Kaha system');
      }

      const kahaUser = response.data.data[0];
      console.log('✅ SERVICE: Found Kaha user:', {
        fullName: kahaUser.fullName,
        kahaId: kahaUser.kahaId,
        email: kahaUser.email,
        phone: kahaUser.contactNumber,
        id: kahaUser.id
      });
      this.logger.log(`✅ Found Kaha user: ${kahaUser.fullName} (${kahaUser.kahaId})`);

      // Step 2: Extract user data from Kaha API (this is the source of truth)
      const userEmail = kahaUser.email;
      const userPhone = kahaUser.contactNumber;
      const userName = kahaUser.fullName;
      const contactPersonUserId = kahaUser.id;

      console.log('📝 SERVICE: Extracted data from Kaha API:', {
        contactPersonUserId,
        userName,
        userPhone,
        userEmail,
        hostelId
      });

      // Step 3: Validate phone uniqueness AFTER getting phone from Kaha API
      console.log('🔍 SERVICE: About to check phone uniqueness for:', userPhone);
      
      const existingPhone = await this.studentRepository.findOne({
        where: { phone: userPhone }
      });

      console.log('🔍 SERVICE: Phone uniqueness check result:', existingPhone ? 'PHONE EXISTS' : 'PHONE AVAILABLE');

      if (existingPhone) {
        console.log('❌ SERVICE: Phone already exists - throwing BadRequestException');
        throw new BadRequestException(
          `Phone number ${userPhone} is already registered to another student`
        );
      }

      // Step 4: Create student with PENDING_CONFIGURATION status using Kaha API data
      const studentData = {
        userId: contactPersonUserId,  // ✅ Contact person's Kaha userId (from API response)
        name: userName,               // ✅ From Kaha API
        phone: userPhone,            // ✅ From Kaha API
        email: userEmail,            // ✅ From Kaha API
        enrollmentDate: new Date(),
        status: StudentStatus.PENDING_CONFIGURATION,
        isConfigured: false,
        hostelId,
        address: null,
        roomId: null,
        bedNumber: null
      };

      console.log('💾 SERVICE: About to create student with data:', JSON.stringify(studentData, null, 2));

      const student = this.studentRepository.create(studentData);

      console.log('💾 SERVICE: Student entity created, about to save...');
      const savedStudent = await this.studentRepository.save(student);

      console.log('✅ SERVICE: Student saved successfully:', {
        id: savedStudent.id,
        name: savedStudent.name,
        phone: savedStudent.phone,
        status: savedStudent.status
      });

      this.logger.log(
        `✅ Student created: ${savedStudent.name} (ID: ${savedStudent.id}) - Status: PENDING_CONFIGURATION`
      );

      const apiResponse = this.transformToApiResponse(savedStudent);
      console.log('📤 SERVICE: Returning API response:', JSON.stringify(apiResponse, null, 2));
      
      return apiResponse;
    } catch (error) {
      console.log('❌ SERVICE: Error in createStudentFromToken:', error.message);
      console.log('❌ SERVICE: Error type:', error.constructor.name);
      console.log('❌ SERVICE: Error stack:', error.stack);
      
      this.logger.error(`❌ Error creating student from token: ${error.message}`);

      if (error instanceof BadRequestException) {
        console.log('❌ SERVICE: Re-throwing BadRequestException');
        throw error;
      }

      console.log('❌ SERVICE: Throwing generic BadRequestException');
      throw new BadRequestException(
        'Failed to create student. Please check your input and try again.'
      );
    }
  }
}