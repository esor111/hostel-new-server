import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry, LedgerEntryType, BalanceType } from './entities/ledger-entry.entity';
import { Student } from '../students/entities/student.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Discount } from '../discounts/entities/discount.entity';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntry)
    private ledgerRepository: Repository<LedgerEntry>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Discount)
    private discountRepository: Repository<Discount>,
  ) { }

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

    // Conditional hostel filtering - if hostelId provided, filter by it; if not, return all data
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

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Order by date and entry number
    queryBuilder.orderBy('ledger.date', 'DESC')
      .addOrderBy('ledger.entryNumber', 'DESC');

    const [entries, total] = await queryBuilder.getManyAndCount();

    // Transform to API response format
    const transformedItems = entries.map(entry => this.transformToApiResponse(entry));

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

  async findByStudentId(studentId: string, hostelId: string) {
    const entries = await this.ledgerRepository.find({
      where: { studentId, hostelId },
      relations: ['student'],
      order: { date: 'DESC', entryNumber: 'DESC' }
    });

    return entries.map(entry => this.transformToApiResponse(entry));
  }

  async getStudentBalance(studentId: string, hostelId: string) {
    const result = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .select('SUM(ledger.debit)', 'totalDebits')
      .addSelect('SUM(ledger.credit)', 'totalCredits')
      .addSelect('COUNT(*)', 'totalEntries')
      .where('ledger.studentId = :studentId', { studentId })
      .andWhere('ledger.hostelId = :hostelId', { hostelId })
      .andWhere('ledger.isReversed = :isReversed', { isReversed: false })
      .getRawOne();

    const totalDebits = parseFloat(result?.totalDebits) || 0;
    const totalCredits = parseFloat(result?.totalCredits) || 0;
    const netBalance = totalDebits - totalCredits;

    return {
      studentId,
      currentBalance: netBalance,
      debitBalance: totalDebits,
      creditBalance: totalCredits,
      balanceType: netBalance > 0 ? BalanceType.DR : netBalance < 0 ? BalanceType.CR : BalanceType.NIL,
      totalEntries: parseInt(result?.totalEntries) || 0
    };
  }

  async createInvoiceEntry(invoice: Invoice) {
    const student = await this.studentRepository.findOne({ where: { id: invoice.studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get current balance
    const currentBalance = await this.getStudentBalance(invoice.studentId, invoice.hostelId);
    const invoiceAmount = parseFloat(invoice.total?.toString() || '0');
    const newBalance = currentBalance.currentBalance + invoiceAmount;

    const entry = this.ledgerRepository.create({
      studentId: invoice.studentId,
      hostelId: invoice.hostelId, // Add the hostelId from the invoice
      date: new Date(),
      type: LedgerEntryType.INVOICE,
      description: `Invoice for ${invoice.month} - ${student.name}`,
      referenceId: invoice.id,
      debit: invoiceAmount,
      credit: 0,
      balance: newBalance, // Store the actual running balance, not absolute value
      balanceType: newBalance > 0 ? BalanceType.DR : newBalance < 0 ? BalanceType.CR : BalanceType.NIL,
      entryNumber: await this.getNextEntryNumber()
    });

    const savedEntry = await this.ledgerRepository.save(entry);

    // Update student's current balance
    await this.updateStudentBalance(invoice.studentId, invoice.hostelId);

    return this.transformToApiResponse(savedEntry);
  }

  async createPaymentEntry(payment: Payment) {
    const student = await this.studentRepository.findOne({ where: { id: payment.studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get current balance
    const currentBalance = await this.getStudentBalance(payment.studentId, payment.hostelId || student.hostelId || 'default-hostel');
    const paymentAmount = parseFloat(payment.amount?.toString() || '0');
    const newBalance = currentBalance.currentBalance - paymentAmount;

    const entry = this.ledgerRepository.create({
      studentId: payment.studentId,
      hostelId: payment.hostelId || student.hostelId || 'default-hostel',
      date: payment.paymentDate,
      type: LedgerEntryType.PAYMENT,
      description: `Payment received - ${payment.paymentMethod} - ${student.name}`,
      referenceId: payment.id,
      debit: 0,
      credit: paymentAmount,
      balance: newBalance, // Store the actual running balance, not absolute value
      balanceType: newBalance > 0 ? BalanceType.DR : newBalance < 0 ? BalanceType.CR : BalanceType.NIL,
      entryNumber: await this.getNextEntryNumber()
    });

    const savedEntry = await this.ledgerRepository.save(entry);

    // Update student's current balance
    await this.updateStudentBalance(payment.studentId, payment.hostelId || student.hostelId);

    return this.transformToApiResponse(savedEntry);
  }

  async createDiscountEntry(discount: Discount) {
    const student = await this.studentRepository.findOne({ where: { id: discount.studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get current balance
    const currentBalance = await this.getStudentBalance(discount.studentId, discount.hostelId);
    const discountAmount = parseFloat(discount.amount?.toString() || '0');
    const newBalance = currentBalance.currentBalance - discountAmount;

    const entry = this.ledgerRepository.create({
      studentId: discount.studentId,
      hostelId: discount.hostelId, // Add the hostelId from the discount
      date: discount.date,
      type: LedgerEntryType.DISCOUNT,
      description: `Discount applied - ${discount.reason} - ${student.name}`,
      referenceId: discount.id,
      debit: 0,
      credit: discountAmount,
      balance: newBalance, // Store the actual running balance, not absolute value
      balanceType: newBalance > 0 ? BalanceType.DR : newBalance < 0 ? BalanceType.CR : BalanceType.NIL,
      entryNumber: await this.getNextEntryNumber(),

    });

    const savedEntry = await this.ledgerRepository.save(entry);

    // Update student's current balance
    await this.updateStudentBalance(discount.studentId, discount.hostelId);

    return this.transformToApiResponse(savedEntry);
  }

  async createAdjustmentEntry(studentId: string, amount: number, description: string, type: 'debit' | 'credit', hostelId: string) {
    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get current balance
    const currentBalance = await this.getStudentBalance(studentId, hostelId);
    const adjustmentAmount = parseFloat(amount?.toString() || '0');
    const newBalance = type === 'debit'
      ? currentBalance.currentBalance + adjustmentAmount
      : currentBalance.currentBalance - adjustmentAmount;

    // Use safe enum values - Debit uses Invoice, Credit uses Payment
    const safeType = type === 'debit' ? LedgerEntryType.INVOICE : LedgerEntryType.PAYMENT;

    const entry = this.ledgerRepository.create({
      studentId,
      hostelId: student.hostelId, // Add the hostelId from the student
      date: new Date(),
      type: safeType,
      description: `${type.toUpperCase()} Adjustment - ${description} - ${student.name}`,
      referenceId: null,
      debit: type === 'debit' ? adjustmentAmount : 0,
      credit: type === 'credit' ? adjustmentAmount : 0,
      balance: newBalance, // Store the actual running balance, not absolute value
      balanceType: newBalance > 0 ? BalanceType.DR : newBalance < 0 ? BalanceType.CR : BalanceType.NIL,
      entryNumber: await this.getNextEntryNumber()
    });

    const savedEntry = await this.ledgerRepository.save(entry);

    // Update student's current balance
    await this.updateStudentBalance(studentId, hostelId);

    return this.transformToApiResponse(savedEntry);
  }

  async reverseEntry(entryId: string, reversedBy: string = 'admin', reason: string = 'Manual reversal') {
    const entry = await this.ledgerRepository.findOne({ where: { id: entryId } });
    if (!entry) {
      throw new NotFoundException('Ledger entry not found');
    }

    if (entry.isReversed) {
      throw new Error('Entry is already reversed');
    }

    // Mark original entry as reversed
    await this.ledgerRepository.update(entryId, {
      isReversed: true,
      reversedBy,
      reversalDate: new Date()
    });

    // Create reversal entry
    const currentBalance = await this.getStudentBalance(entry.studentId, entry.hostelId);
    const reversalAmount = entry.debit - entry.credit;
    const newBalance = currentBalance.currentBalance - reversalAmount;

    const reversalEntry = this.ledgerRepository.create({
      studentId: entry.studentId,
      hostelId: entry.hostelId, // Add the hostelId from the original entry
      date: new Date(),
      type: entry.type,
      description: `REVERSAL: ${entry.description} - ${reason}`,
      referenceId: entry.referenceId,
      debit: entry.credit, // Swap debit and credit
      credit: entry.debit,
      balance: Math.abs(newBalance),
      balanceType: newBalance > 0 ? BalanceType.DR : newBalance < 0 ? BalanceType.CR : BalanceType.NIL,
      entryNumber: await this.getNextEntryNumber()
    });

    const savedReversalEntry = await this.ledgerRepository.save(reversalEntry);

    // Update student's current balance
    await this.updateStudentBalance(entry.studentId);

    return {
      originalEntry: this.transformToApiResponse(entry),
      reversalEntry: this.transformToApiResponse(savedReversalEntry)
    };
  }

  async getStats() {
    const totalEntries = await this.ledgerRepository.count({ where: { isReversed: false } });

    const balanceResult = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .select('SUM(ledger.debit)', 'totalDebits')
      .addSelect('SUM(ledger.credit)', 'totalCredits')
      .addSelect('COUNT(DISTINCT ledger.studentId)', 'activeStudents')
      .where('ledger.isReversed = :isReversed', { isReversed: false })
      .getRawOne();

    const typeBreakdown = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .select('ledger.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(ledger.debit)', 'totalDebits')
      .addSelect('SUM(ledger.credit)', 'totalCredits')
      .where('ledger.isReversed = :isReversed', { isReversed: false })
      .groupBy('ledger.type')
      .getRawMany();

    const breakdown = {};
    typeBreakdown.forEach(row => {
      breakdown[row.type] = {
        count: parseInt(row.count),
        totalDebits: parseFloat(row.totalDebits) || 0,
        totalCredits: parseFloat(row.totalCredits) || 0
      };
    });

    return {
      totalEntries,
      totalDebits: parseFloat(balanceResult?.totalDebits) || 0,
      totalCredits: parseFloat(balanceResult?.totalCredits) || 0,
      netBalance: (parseFloat(balanceResult?.totalDebits) || 0) - (parseFloat(balanceResult?.totalCredits) || 0),
      activeStudents: parseInt(balanceResult?.activeStudents) || 0,
      entryTypeBreakdown: breakdown
    };
  }

  // Transform normalized data back to exact API format
  private transformToApiResponse(entry: LedgerEntry): any {
    return {
      id: entry.id,
      studentId: entry.studentId,
      studentName: entry.student?.name || '',
      date: entry.date,
      type: entry.type,
      description: entry.description,
      referenceId: entry.referenceId,
      debit: parseFloat(entry.debit?.toString() || '0'),
      credit: parseFloat(entry.credit?.toString() || '0'),
      balance: parseFloat(entry.balance?.toString() || '0'),
      balanceType: entry.balanceType,
      notes: entry.notes,
      createdAt: entry.createdAt
    };
  }

  private async updateStudentBalance(studentId: string, hostelId?: string) {
    // Get student to extract hostelId if not provided
    if (!hostelId) {
      const student = await this.studentRepository.findOne({ where: { id: studentId } });
      hostelId = student?.hostelId;
    }
    
    if (hostelId) {
      const balance = await this.getStudentBalance(studentId, hostelId);
      // This would update a balance field on the student if it existed
      // For now, we'll skip this as the student entity doesn't have a currentBalance field
    }
  }

  private async getNextEntryNumber(): Promise<number> {
    const lastEntry = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .orderBy('ledger.entryNumber', 'DESC')
      .getOne();
    return (lastEntry?.entryNumber || 0) + 1;
  }

  /**
   * Fix existing ledger entries that have "undefined" in their descriptions
   * This method should be called once to clean up existing data
   */
  async fixUndefinedDescriptions(): Promise<{ fixed: number; errors: string[] }> {
    const errors: string[] = [];
    let fixedCount = 0;

    try {
      // Find all entries with "undefined" in description
      const entriesWithUndefined = await this.ledgerRepository
        .createQueryBuilder('entry')
        .leftJoinAndSelect('entry.student', 'student')
        .where('entry.description LIKE :pattern', { pattern: '%undefined%' })
        .getMany();

      console.log(`Found ${entriesWithUndefined.length} entries with undefined descriptions`);

      for (const entry of entriesWithUndefined) {
        try {
          let newDescription = entry.description;

          // Get student if not loaded
          let student = entry.student;
          if (!student && entry.studentId) {
            student = await this.studentRepository.findOne({ 
              where: { id: entry.studentId } 
            });
          }

          if (student) {
            // Fix payment descriptions
            if (entry.description.includes('Payment received') && entry.description.includes('undefined')) {
              const parts = entry.description.split(' - ');
              if (parts.length >= 3) {
                newDescription = `Payment received - ${parts[1]} - ${student.name}`;
              }
            }
            
            // Fix invoice descriptions
            else if (entry.description.includes('Invoice for') && entry.description.includes('undefined')) {
              const parts = entry.description.split(' - ');
              if (parts.length >= 2) {
                newDescription = `Invoice for ${parts[0].replace('Invoice for ', '')} - ${student.name}`;
              }
            }
            
            // Fix discount descriptions
            else if (entry.description.includes('Discount applied') && entry.description.includes('undefined')) {
              const parts = entry.description.split(' - ');
              if (parts.length >= 3) {
                newDescription = `Discount applied - ${parts[1]} - ${student.name}`;
              }
            }

            // Update if description changed
            if (newDescription !== entry.description) {
              await this.ledgerRepository.update(entry.id, { 
                description: newDescription 
              });
              fixedCount++;
              console.log(`Fixed entry ${entry.id}: "${entry.description}" -> "${newDescription}"`);
            }
          } else {
            errors.push(`Could not find student for entry ${entry.id} (studentId: ${entry.studentId})`);
          }
        } catch (error) {
          errors.push(`Error fixing entry ${entry.id}: ${error.message}`);
        }
      }

      console.log(`Fixed ${fixedCount} entries with ${errors.length} errors`);
      return { fixed: fixedCount, errors };

    } catch (error) {
      console.error('Error in fixUndefinedDescriptions:', error);
      throw error;
    }
  }
}