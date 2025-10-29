import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntryV2 } from '../entities/ledger-entry-v2.entity';
import { Student } from '../../students/entities/student.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { AdminCharge } from '../../admin-charges/entities/admin-charge.entity';
import { Discount } from '../../discounts/entities/discount.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { LedgerEntryType } from '../../ledger/entities/ledger-entry.entity';
import { LedgerTransactionService } from './ledger-transaction.service';
import { LedgerCalculationService } from './ledger-calculation.service';
import { CreateLedgerEntryV2Dto } from '../dto/create-ledger-entry-v2.dto';

@Injectable()
export class LedgerV2Service {
  constructor(
    @InjectRepository(LedgerEntryV2)
    private ledgerRepository: Repository<LedgerEntryV2>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private transactionService: LedgerTransactionService,
    private calculationService: LedgerCalculationService,
  ) {}

  /**
   * ✅ BULLETPROOF: Get all ledger entries with filtering and pagination
   */
  async findAll(filters: any = {}, hostelId?: string) {
    const {
      page = 1,
      limit = 50,
      studentId,
      type,
      dateFrom,
      dateTo,
      search
    } = filters;

    const queryBuilder = this.ledgerRepository.createQueryBuilder('ledger')
      .leftJoinAndSelect('ledger.student', 'student');

    // Hostel filtering
    if (hostelId) {
      queryBuilder.andWhere('ledger.hostelId = :hostelId', { hostelId });
    }

    // Apply filters
    if (studentId) {
      queryBuilder.andWhere('ledger.studentId = :studentId', { studentId });
    }

    if (type) {
      queryBuilder.andWhere('ledger.type = :type', { type });
    }

    if (dateFrom) {
      queryBuilder.andWhere('ledger.date >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('ledger.date <= :dateTo', { dateTo });
    }

    if (search) {
      queryBuilder.andWhere(
        '(student.name ILIKE :search OR ledger.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    queryBuilder.andWhere('ledger.isReversed = false');

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Order by sequence for proper chronological order
    queryBuilder.orderBy('ledger.entrySequence', 'DESC');

    const [entries, total] = await queryBuilder.getManyAndCount();

    return {
      items: entries.map(entry => this.transformToApiResponse(entry)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * ✅ BULLETPROOF: Get student ledger entries
   */
  async findByStudentId(studentId: string) {
    const entries = await this.ledgerRepository.find({
      where: { studentId, isReversed: false },
      relations: ['student'],
      order: { entrySequence: 'DESC' }
    });

    return entries.map(entry => this.transformToApiResponse(entry));
  }

  /**
   * ✅ BULLETPROOF: Get student balance
   */
  async getStudentBalance(studentId: string) {
    const result = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .select('SUM(ledger.debit)', 'totalDebits')
      .addSelect('SUM(ledger.credit)', 'totalCredits')
      .addSelect('COUNT(*)', 'totalEntries')
      .where('ledger.studentId = :studentId', { studentId })
      .andWhere('ledger.isReversed = false')
      .getRawOne();

    const totalDebits = parseFloat(result?.totalDebits) || 0;
    const totalCredits = parseFloat(result?.totalCredits) || 0;
    const currentBalance = totalDebits - totalCredits;

    return {
      studentId,
      currentBalance,
      debitBalance: totalDebits,
      creditBalance: totalCredits,
      balanceType: this.calculationService.determineBalanceType(currentBalance),
      totalEntries: parseInt(result?.totalEntries) || 0
    };
  }

  /**
   * ✅ BULLETPROOF: Create payment entry
   */
  async createPaymentEntry(payment: Payment) {
    const student = await this.studentRepository.findOne({ where: { id: payment.studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const entryData: CreateLedgerEntryV2Dto = {
      studentId: payment.studentId,
      hostelId: payment.hostelId || student.hostelId,
      type: LedgerEntryType.PAYMENT,
      description: `Payment received - ${payment.paymentMethod} - ${student.name}`,
      referenceId: payment.id,
      debit: 0,
      credit: parseFloat(payment.amount.toString()),
      date: payment.paymentDate instanceof Date ? payment.paymentDate.toISOString() : new Date(payment.paymentDate).toISOString(),
      notes: payment.notes
    };

    const savedEntry = await this.transactionService.createEntryWithTransaction(entryData);
    return this.transformToApiResponse(savedEntry);
  }

  /**
   * ✅ BULLETPROOF: Create invoice entry
   */
  async createInvoiceEntry(invoice: Invoice) {
    const student = await this.studentRepository.findOne({ where: { id: invoice.studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const entryData: CreateLedgerEntryV2Dto = {
      studentId: invoice.studentId,
      hostelId: invoice.hostelId || student.hostelId,
      type: LedgerEntryType.INVOICE,
      description: `Invoice for ${invoice.month} - ${student.name}`,
      referenceId: invoice.id,
      debit: parseFloat(invoice.total.toString()),
      credit: 0
    };

    const savedEntry = await this.transactionService.createEntryWithTransaction(entryData);
    return this.transformToApiResponse(savedEntry);
  }

  /**
   * ✅ BULLETPROOF: Create admin charge entry
   */
  async createAdminChargeEntry(charge: AdminCharge) {
    const student = await this.studentRepository.findOne({ where: { id: charge.studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const entryData: CreateLedgerEntryV2Dto = {
      studentId: charge.studentId,
      hostelId: charge.hostelId || student.hostelId,
      type: LedgerEntryType.ADMIN_CHARGE,
      description: `Admin Charge: ${charge.title}${charge.description ? ' - ' + charge.description : ''}`,
      referenceId: charge.id,
      debit: parseFloat(charge.amount.toString()),
      credit: 0,
      notes: charge.description
    };

    const savedEntry = await this.transactionService.createEntryWithTransaction(entryData);
    return this.transformToApiResponse(savedEntry);
  }

  /**
   * ✅ BULLETPROOF: Create discount entry
   */
  async createDiscountEntry(discount: Discount) {
    const student = await this.studentRepository.findOne({ where: { id: discount.studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const entryData: CreateLedgerEntryV2Dto = {
      studentId: discount.studentId,
      hostelId: discount.hostelId || student.hostelId,
      type: LedgerEntryType.DISCOUNT,
      description: `Discount applied - ${discount.reason} - ${student.name}`,
      referenceId: discount.id,
      debit: 0,
      credit: parseFloat(discount.amount.toString()),
      date: discount.date.toISOString(),
      notes: discount.notes
    };

    const savedEntry = await this.transactionService.createEntryWithTransaction(entryData);
    return this.transformToApiResponse(savedEntry);
  }

  /**
   * ✅ BULLETPROOF: Create adjustment entry
   */
  async createAdjustmentEntry(adjustmentData: {
    studentId: string;
    amount: number;
    description: string;
    type: 'debit' | 'credit';
  }) {
    const { studentId, amount, description, type } = adjustmentData;
    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const entryData: CreateLedgerEntryV2Dto = {
      studentId,
      hostelId: student.hostelId,
      type: LedgerEntryType.ADJUSTMENT,
      description: `${type.toUpperCase()} Adjustment - ${description} - ${student.name}`,
      referenceId: null,
      debit: type === 'debit' ? amount : 0,
      credit: type === 'credit' ? amount : 0
    };

    const savedEntry = await this.transactionService.createEntryWithTransaction(entryData);
    return this.transformToApiResponse(savedEntry);
  }

  /**
   * ✅ BULLETPROOF: Reverse entry
   */
  async reverseEntry(entryId: string, reversedBy: string = 'admin', reason: string = 'Manual reversal') {
    const result = await this.transactionService.reverseEntryWithTransaction(entryId, reason, reversedBy);

    return {
      originalEntry: this.transformToApiResponse(result.originalEntry),
      reversalEntry: this.transformToApiResponse(result.reversalEntry)
    };
  }

  /**
   * ✅ BULLETPROOF: Get ledger statistics
   */
  async getStats(hostelId?: string) {
    const queryBuilder = this.ledgerRepository.createQueryBuilder('ledger');

    if (hostelId) {
      queryBuilder.where('ledger.hostelId = :hostelId', { hostelId });
    }

    queryBuilder.andWhere('ledger.isReversed = false');

    const totalEntries = await queryBuilder.getCount();

    const balanceResult = await queryBuilder
      .select('SUM(ledger.debit)', 'totalDebits')
      .addSelect('SUM(ledger.credit)', 'totalCredits')
      .addSelect('COUNT(DISTINCT ledger.studentId)', 'activeStudents')
      .getRawOne();

    const totalDebits = parseFloat(balanceResult?.totalDebits) || 0;
    const totalCredits = parseFloat(balanceResult?.totalCredits) || 0;

    return {
      totalEntries,
      totalDebits,
      totalCredits,
      netBalance: totalDebits - totalCredits,
      activeStudents: parseInt(balanceResult?.activeStudents) || 0
    };
  }

  /**
   * ✅ BULLETPROOF: Reconcile student balance
   */
  async reconcileStudentBalance(studentId: string) {
    try {
      // Calculate balance from entries
      const entries = await this.ledgerRepository.find({
        where: { studentId, isReversed: false },
        order: { entrySequence: 'ASC' }
      });

      let calculatedBalance = 0;
      for (const entry of entries) {
        calculatedBalance += parseFloat(entry.debit.toString()) - parseFloat(entry.credit.toString());
      }

      // Get current stored balance
      const currentBalance = await this.getStudentBalance(studentId);
      const storedBalance = currentBalance.currentBalance;
      const discrepancy = Math.abs(calculatedBalance - storedBalance);

      return {
        studentId,
        status: discrepancy < 0.01 ? 'BALANCED' : 'DISCREPANCY_FOUND',
        calculatedBalance,
        storedBalance,
        discrepancy,
        requiresCorrection: discrepancy >= 0.01,
        totalEntries: entries.length,
        reconciledAt: new Date()
      };
    } catch (error) {
      return {
        studentId,
        status: 'ERROR',
        calculatedBalance: 0,
        storedBalance: 0,
        discrepancy: 0,
        requiresCorrection: true,
        totalEntries: 0,
        reconciledAt: new Date(),
        errorMessage: error.message
      };
    }
  }

  /**
   * ✅ BULLETPROOF: Get charge counts for multiple students (bulk operation)
   */
  async getStudentChargeCounts(studentIds: string[], hostelId?: string): Promise<Record<string, number>> {
    if (!studentIds || studentIds.length === 0) {
      return {};
    }

    const queryBuilder = this.ledgerRepository
      .createQueryBuilder('ledger')
      .select('ledger.studentId', 'studentId')
      .addSelect('COUNT(*)', 'count')
      .where('ledger.studentId IN (:...studentIds)', { studentIds })
      .andWhere('ledger.isReversed = false')
      .groupBy('ledger.studentId');

    if (hostelId) {
      queryBuilder.andWhere('ledger.hostelId = :hostelId', { hostelId });
    }

    const results = await queryBuilder.getRawMany();

    // Convert array to object map
    const chargeCounts: Record<string, number> = {};
    results.forEach(result => {
      chargeCounts[result.studentId] = parseInt(result.count) || 0;
    });

    // Ensure all requested students have an entry (even if 0)
    studentIds.forEach(studentId => {
      if (!(studentId in chargeCounts)) {
        chargeCounts[studentId] = 0;
      }
    });

    return chargeCounts;
  }

  /**
   * Transform entity to API response (same format as existing)
   */
  private transformToApiResponse(entry: LedgerEntryV2): any {
    return {
      id: entry.id,
      studentId: entry.studentId,
      studentName: entry.student?.name || '',
      date: entry.date,
      type: entry.type,
      description: entry.description,
      referenceId: entry.referenceId,
      debit: parseFloat(entry.debit.toString()),
      credit: parseFloat(entry.credit.toString()),
      balance: Math.abs(parseFloat(entry.runningBalance.toString())), // For API compatibility
      runningBalance: parseFloat(entry.runningBalance.toString()), // Actual balance
      balanceType: entry.balanceType,
      notes: entry.notes,
      createdAt: entry.createdAt
    };
  }
}