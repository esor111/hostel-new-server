import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from '../../students/entities/student.entity';
import { Invoice, InvoiceStatus } from '../../invoices/entities/invoice.entity';
import { InvoiceItem, InvoiceItemCategory } from '../../invoices/entities/invoice-item.entity';
import { Payment, PaymentType, PaymentStatus } from '../../payments/entities/payment.entity';
import { StudentFinancialInfo, FeeType } from '../../students/entities/student-financial-info.entity';
import { LedgerV2Service } from '../../ledger-v2/services/ledger-v2.service';
import { AdvancePaymentService } from '../../students/services/advance-payment.service';

export interface PaymentStatusResult {
  status: 'ADVANCE_PAID' | 'PAYMENT_DUE' | 'DUE_TOMORROW' | 'DUE_TODAY' | 'OVERDUE' | 'PAID';
  message: string;
  dueAmount: number;
  daysUntilDue?: number;
  daysOverdue?: number;
  nextPaymentMonth?: string;
  dueDate?: string;
}

export interface MonthlyBillingResult {
  success: boolean;
  generated: number;
  skipped: number;
  failed: number;
  totalAmount: number;
  invoices: Invoice[];
  skippedStudents: Array<{
    studentId: string;
    studentName: string;
    reason: string;
  }>;
  errors: Array<{
    studentId: string;
    studentName: string;
    error: string;
  }>;
}

@Injectable()
export class NepalesesBillingService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(StudentFinancialInfo)
    private financialInfoRepository: Repository<StudentFinancialInfo>,
    private ledgerV2Service: LedgerV2Service,
    private advancePaymentService: AdvancePaymentService,
  ) {}

  /**
   * Generate monthly invoices following Nepalese billing practice
   * Skips students who have advance payment for the billing month
   */
  async generateMonthlyInvoices(
    month: number, 
    year: number, 
    dueDate?: Date, 
    hostelId?: string
  ): Promise<MonthlyBillingResult> {
    if (!hostelId) {
      throw new BadRequestException('Hostel context required for billing');
    }

    console.log(`🧾 Generating Nepalese monthly invoices for ${month + 1}/${year}`);
    
    // Get all active configured students
    const activeStudents = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.financialInfo', 'financial')
      .where('student.status = :status', { status: StudentStatus.ACTIVE })
      .andWhere('student.hostelId = :hostelId', { hostelId })
      .andWhere('student.isConfigured = :isConfigured', { isConfigured: true })
      .andWhere('financial.isActive = :isActive', { isActive: true })
      .getMany();

    console.log(`📊 Found ${activeStudents.length} active configured students`);

    const result: MonthlyBillingResult = {
      success: true,
      generated: 0,
      skipped: 0,
      failed: 0,
      totalAmount: 0,
      invoices: [],
      skippedStudents: [],
      errors: []
    };

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    for (const student of activeStudents) {
      try {
        // NEW: Always generate invoices regardless of advance payments
        // Advance payments are now credit balance only, used at checkout
        
        // Check if invoice already exists for this month
        const existingInvoice = await this.invoiceRepository.findOne({
          where: {
            studentId: student.id,
            month: monthKey
          }
        });

        if (existingInvoice) {
          result.skipped++;
          result.skippedStudents.push({
            studentId: student.id,
            studentName: student.name,
            reason: `Invoice already exists for ${monthKey}`
          });
          console.log(`⚠️ Invoice already exists for ${student.name} for ${monthKey}`);
          continue;
        }

        // Generate full month invoice
        const invoice = await this.generateFullMonthInvoice(student, month, year, dueDate, hostelId);
        
        result.generated++;
        result.totalAmount += Number(invoice.total);
        result.invoices.push(invoice);
        
        console.log(`✅ Generated invoice for ${student.name}: NPR ${Number(invoice.total).toLocaleString()}`);
        
      } catch (error) {
        result.failed++;
        result.errors.push({
          studentId: student.id,
          studentName: student.name,
          error: error.message
        });
        console.error(`❌ Failed to generate invoice for ${student.name}:`, error.message);
      }
    }

    console.log(`🎉 Nepalese monthly billing complete: ${result.generated} generated, ${result.skipped} skipped, ${result.failed} failed`);
    console.log(`💰 Total amount: NPR ${result.totalAmount.toLocaleString()}`);

    return result;
  }

  /**
   * DEPRECATED: No longer needed - advance payments are now credit balance only
   * Check if billing month is the same as student's advance payment month
   */
  // private isAdvancePaymentMonth(student: Student, billingMonth: number, billingYear: number): boolean {
  //   if (!student.advancePaymentMonth) {
  //     return false;
  //   }

  //   const [advanceYear, advanceMonth] = student.advancePaymentMonth.split('-').map(Number);
  //   return advanceYear === billingYear && (advanceMonth - 1) === billingMonth;
  // }

  /**
   * Generate full month invoice for student
   */
  private async generateFullMonthInvoice(
    student: Student, 
    month: number, 
    year: number, 
    dueDate?: Date,
    hostelId?: string
  ): Promise<Invoice> {
    // Calculate monthly fee from financial info
    const feeCalculation = await this.advancePaymentService.calculateMonthlyFee(student.id);

    // Set due date (default to 10th of the month, or last day of current month for Nepalese practice)
    const invoiceDueDate = dueDate || new Date(year, month, 10);
    
    // Generate invoice number
    const timestamp = Date.now().toString().slice(-8);
    const invoiceNumber = `INV-${year}${String(month + 1).padStart(2, '0')}-${timestamp}`;
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Create invoice
    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      studentId: student.id,
      hostelId: hostelId || student.hostelId,
      month: monthKey,
      total: feeCalculation.totalMonthlyFee,
      subtotal: feeCalculation.totalMonthlyFee,
      status: InvoiceStatus.UNPAID,
      dueDate: invoiceDueDate,
      notes: `Monthly charges for ${this.getMonthName(month)} ${year} - Nepalese billing system`,
      generatedBy: 'nepalese_billing_system'
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create invoice items for each fee type
    for (const feeItem of feeCalculation.breakdown) {
      const invoiceItem = this.invoiceItemRepository.create({
        invoiceId: savedInvoice.id,
        description: feeItem.description,
        amount: feeItem.amount,
        category: this.mapFeeTypeToCategory(feeItem.feeType),
        quantity: 1,
        unitPrice: feeItem.amount
      });
      
      await this.invoiceItemRepository.save(invoiceItem);
    }

    // Create ledger entry for the invoice
    try {
      await this.ledgerV2Service.createAdjustmentEntry({
        studentId: student.id,
        amount: feeCalculation.totalMonthlyFee,
        description: `Monthly Invoice - ${this.getMonthName(month)} ${year} - ${student.name}`,
        type: 'debit'
      }, hostelId || student.hostelId);
    } catch (error) {
      console.error('Failed to create ledger entry for invoice:', error);
      // Don't fail the invoice creation if ledger entry fails
    }

    return savedInvoice;
  }

  /**
   * Get payment status for student following Nepalese billing practice
   */
  async getPaymentStatus(studentId: string, hostelId: string): Promise<PaymentStatusResult> {
    const student = await this.studentRepository.findOne({
      where: { id: studentId, hostelId }
    });

    if (!student) {
      throw new BadRequestException('Student not found');
    }

    if (!student.isConfigured) {
      return {
        status: 'PAYMENT_DUE',
        message: 'Student not configured - advance payment required',
        dueAmount: 0
      };
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Check if current month is covered by advance payment
    if (student.advancePaymentMonth === currentMonthKey) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const nextMonthName = this.getMonthName(nextMonth);
      
      return {
        status: 'ADVANCE_PAID',
        message: `${this.getMonthName(currentMonth)} ${currentYear} - Paid in Advance`,
        dueAmount: 0,
        nextPaymentMonth: `${nextMonthName} ${nextYear}`
      };
    }

    // Calculate payment due status for next month (Nepalese practice: pay by end of current month)
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonthKey = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`;
    const nextMonthName = this.getMonthName(nextMonth);

    // Check if next month invoice exists and is paid
    const nextMonthInvoice = await this.invoiceRepository.findOne({
      where: { studentId, month: nextMonthKey }
    });

    if (nextMonthInvoice && nextMonthInvoice.status === InvoiceStatus.PAID) {
      return {
        status: 'PAID',
        message: `${nextMonthName} ${nextYear} - Paid`,
        dueAmount: 0
      };
    }

    // Calculate days until payment due (last day of current month)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysUntilDue = Math.ceil((lastDayOfMonth.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get monthly fee amount
    const feeCalculation = await this.advancePaymentService.calculateMonthlyFee(studentId);

    if (daysUntilDue > 1) {
      return {
        status: 'PAYMENT_DUE',
        message: `${nextMonthName} ${nextYear} payment due in ${daysUntilDue} days`,
        dueAmount: feeCalculation.totalMonthlyFee,
        daysUntilDue,
        nextPaymentMonth: `${nextMonthName} ${nextYear}`,
        dueDate: lastDayOfMonth.toLocaleDateString()
      };
    } else if (daysUntilDue === 1) {
      return {
        status: 'DUE_TOMORROW',
        message: `${nextMonthName} ${nextYear} payment due tomorrow`,
        dueAmount: feeCalculation.totalMonthlyFee,
        daysUntilDue: 1,
        nextPaymentMonth: `${nextMonthName} ${nextYear}`,
        dueDate: lastDayOfMonth.toLocaleDateString()
      };
    } else if (daysUntilDue === 0) {
      return {
        status: 'DUE_TODAY',
        message: `${nextMonthName} ${nextYear} payment due today`,
        dueAmount: feeCalculation.totalMonthlyFee,
        daysUntilDue: 0,
        nextPaymentMonth: `${nextMonthName} ${nextYear}`,
        dueDate: lastDayOfMonth.toLocaleDateString()
      };
    } else {
      const daysOverdue = Math.abs(daysUntilDue);
      return {
        status: 'OVERDUE',
        message: `${nextMonthName} ${nextYear} payment overdue by ${daysOverdue} days`,
        dueAmount: feeCalculation.totalMonthlyFee,
        daysOverdue,
        nextPaymentMonth: `${nextMonthName} ${nextYear}`
      };
    }
  }

  /**
   * Get students with payments due
   */
  async getPaymentDueStudents(hostelId: string): Promise<Array<{
    studentId: string;
    studentName: string;
    roomNumber: string;
    paymentStatus: PaymentStatusResult;
    monthlyFee: number;
  }>> {
    const activeStudents = await this.studentRepository.find({
      where: { 
        status: StudentStatus.ACTIVE, 
        hostelId,
        isConfigured: true 
      },
      relations: ['room']
    });

    const paymentDueStudents = [];

    for (const student of activeStudents) {
      try {
        const paymentStatus = await this.getPaymentStatus(student.id, hostelId);
        const feeCalculation = await this.advancePaymentService.calculateMonthlyFee(student.id);

        if (['PAYMENT_DUE', 'DUE_TOMORROW', 'DUE_TODAY', 'OVERDUE'].includes(paymentStatus.status)) {
          paymentDueStudents.push({
            studentId: student.id,
            studentName: student.name,
            roomNumber: student.room?.roomNumber || 'Not assigned',
            paymentStatus,
            monthlyFee: feeCalculation.totalMonthlyFee
          });
        }
      } catch (error) {
        console.error(`Error getting payment status for ${student.name}:`, error);
      }
    }

    return paymentDueStudents;
  }

  /**
   * Map fee type to invoice item category
   */
  private mapFeeTypeToCategory(feeType: FeeType): InvoiceItemCategory {
    switch (feeType) {
      case FeeType.BASE_MONTHLY:
        return InvoiceItemCategory.ACCOMMODATION;
      case FeeType.LAUNDRY:
        return InvoiceItemCategory.SERVICES;
      case FeeType.FOOD:
        return InvoiceItemCategory.FOOD;
      case FeeType.UTILITIES:
        return InvoiceItemCategory.UTILITIES;
      case FeeType.MAINTENANCE:
        return InvoiceItemCategory.OTHER;
      default:
        return InvoiceItemCategory.OTHER;
    }
  }

  /**
   * Get month name from month number
   */
  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  }
}