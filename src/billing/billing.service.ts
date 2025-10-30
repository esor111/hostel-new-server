import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from '../students/entities/student.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { InvoiceItem, InvoiceItemCategory } from '../invoices/entities/invoice-item.entity';
import { StudentFinancialInfo, FeeType } from '../students/entities/student-financial-info.entity';
import { LedgerEntry, BalanceType, LedgerEntryType } from '../ledger/entities/ledger-entry.entity';
import { Payment } from '../payments/entities/payment.entity';
import { LedgerEntryV2 } from '../ledger-v2/entities/ledger-entry-v2.entity';
import { LedgerV2Service } from '../ledger-v2/services/ledger-v2.service';
import { AdvancePaymentService } from '../students/services/advance-payment.service';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(StudentFinancialInfo)
    private financialInfoRepository: Repository<StudentFinancialInfo>,
    @InjectRepository(LedgerEntry)
    private ledgerRepository: Repository<LedgerEntry>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(LedgerEntryV2)
    private ledgerV2Repository: Repository<LedgerEntryV2>,
    private ledgerV2Service: LedgerV2Service,
    private advancePaymentService: AdvancePaymentService,
  ) {}

  async getMonthlyStats(hostelId: string) {
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Get configured students (students with active financial info)
    const configuredStudents = await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.financialInfo', 'financial')
      .where('student.status = :status', { status: StudentStatus.ACTIVE })
      .andWhere('student.hostelId = :hostelId', { hostelId })
      .andWhere('financial.isActive = :isActive', { isActive: true })
      .getCount();

    // Get current month invoices
    const currentMonthInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.createdAt >= :startDate', { startDate: firstDayOfMonth })
      .andWhere('invoice.createdAt <= :endDate', { endDate: lastDayOfMonth })
      .andWhere('invoice.hostelId = :hostelId', { hostelId })
      .getMany();

    const currentMonthAmount = currentMonthInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.total.toString()), 0);
    const paidInvoices = currentMonthInvoices.filter(inv => inv.status === InvoiceStatus.PAID).length;
    const overdueInvoices = await this.invoiceRepository.count({
      where: { status: InvoiceStatus.OVERDUE, hostelId }
    });

    return {
      configuredStudents,
      currentMonthAmount,
      currentMonthInvoices: currentMonthInvoices.length,
      paidInvoices,
      overdueInvoices
    };
  }

  async generateMonthlyInvoices(month: number, year: number, dueDate?: Date, hostelId?: string) {
    console.log(`🧾 Generating monthly invoices for ${month + 1}/${year}`);
    
    const activeStudents = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.financialInfo', 'financial')
      .leftJoinAndSelect('student.room', 'room')
      .where('student.status = :status', { status: StudentStatus.ACTIVE })
      .andWhere('financial.isActive = :isActive', { isActive: true })
      .getMany();

    console.log(`📊 Found ${activeStudents.length} active students with financial configuration`);

    const generatedInvoices = [];
    const errors = [];
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    for (const student of activeStudents) {
      try {
        // Check if invoice already exists for this month
        const existingInvoice = await this.invoiceRepository.findOne({
          where: {
            studentId: student.id,
            month: monthKey
          }
        });

        if (existingInvoice) {
          console.log(`⚠️ Invoice already exists for ${student.name} for ${monthKey}`);
          continue;
        }

        const invoice = await this.generateStudentInvoice(student, month, year, dueDate);
        generatedInvoices.push(invoice);
        
        console.log(`✅ Generated invoice for ${student.name}: NPR ${invoice.total}`);
      } catch (error) {
        console.error(`❌ Failed to generate invoice for ${student.name}:`, error);
        errors.push({
          studentId: student.id,
          studentName: student.name,
          error: error.message
        });
      }
    }

    const totalAmount = generatedInvoices.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);

    console.log(`🎉 Monthly billing complete: ${generatedInvoices.length} generated, ${errors.length} failed, NPR ${totalAmount.toLocaleString()}`);

    return {
      success: true,
      generated: generatedInvoices.length,
      failed: errors.length,
      totalAmount,
      invoices: generatedInvoices,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async generateStudentInvoice(student: Student, month: number, year: number, dueDate?: Date) {
    // Calculate total amount from active financial info
    let totalAmount = 0;
    const lineItems = [];

    for (const financial of student.financialInfo.filter(f => f.isActive)) {
      totalAmount += parseFloat(financial.amount.toString());
      lineItems.push({
        description: this.getFeeTypeDescription(financial.feeType),
        amount: parseFloat(financial.amount.toString()),
        feeType: financial.feeType
      });
    }

    // Set due date (default to 10th of the month)
    const invoiceDueDate = dueDate || new Date(year, month, 10);
    
    // Generate invoice number (custom format for display)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits for shorter ID
    const invoiceNumber = `INV-${year}${String(month + 1).padStart(2, '0')}-${timestamp}`;
    // Let TypeORM generate UUID for the ID automatically
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const invoice = this.invoiceRepository.create({
      // Remove custom ID - let TypeORM generate UUID automatically
      invoiceNumber,
      studentId: student.id,
      month: monthKey,
      total: totalAmount,
      subtotal: totalAmount,
      status: InvoiceStatus.UNPAID,
      dueDate: invoiceDueDate,
      notes: `Monthly charges for ${this.getMonthName(month)} ${year}`,
      generatedBy: 'automated_billing'
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create invoice items
    for (const item of lineItems) {
      const invoiceItem = this.invoiceItemRepository.create({
        // Remove custom ID - let TypeORM generate UUID automatically
        invoiceId: savedInvoice.id,
        description: item.description,
        amount: item.amount,
        category: InvoiceItemCategory.OTHER, // Default category
        quantity: 1,
        unitPrice: item.amount
      });
      
      await this.invoiceItemRepository.save(invoiceItem);
    }

    // Create ledger entry for the invoice
    try {
      const ledgerEntry = this.ledgerRepository.create({
        // Remove custom ID - let TypeORM generate UUID automatically
        studentId: student.id,
        type: LedgerEntryType.INVOICE,
        description: `Monthly Invoice - ${this.getMonthName(month)} ${year}`,
        debit: totalAmount,
        credit: 0,
        balance: totalAmount,
        balanceType: BalanceType.DR,
        referenceId: savedInvoice.id,
        date: new Date(),
        notes: `Automated monthly billing for ${this.getMonthName(month)} ${year}`
      });
      
      await this.ledgerRepository.save(ledgerEntry);
    } catch (error) {
      console.error('Failed to create ledger entry for invoice:', error);
      // Don't fail the invoice creation if ledger entry fails
    }

    return savedInvoice;
  }

  private getFeeTypeDescription(feeType: FeeType): string {
    switch (feeType) {
      case FeeType.BASE_MONTHLY:
        return 'Monthly Room Rent';
      case FeeType.LAUNDRY:
        return 'Laundry Service';
      case FeeType.FOOD:
        return 'Food Service';
      default:
        return 'Additional Charge';
    }
  }

  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  }

  async getBillingSchedule(months: number = 6, hostelId?: string) {
    const schedule = [];
    const currentDate = new Date();

    for (let i = 0; i < months; i++) {
      const scheduleDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthName = scheduleDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      schedule.push({
        month: monthName,
        date: scheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        year: scheduleDate.getFullYear(),
        monthNumber: scheduleDate.getMonth(),
        isCurrentMonth: i === 0
      });
    }

    return schedule;
  }

  async previewMonthlyBilling(month: number, year: number, hostelId: string) {
    const activeStudents = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.financialInfo', 'financial')
      .leftJoinAndSelect('student.room', 'room')
      .where('student.status = :status', { status: StudentStatus.ACTIVE })
      .andWhere('student.hostelId = :hostelId', { hostelId })
      .andWhere('financial.isActive = :isActive', { isActive: true })
      .getMany();

    let totalAmount = 0;
    const studentPreviews = [];

    for (const student of activeStudents) {
      const activeCharges = student.financialInfo.filter(f => f.isActive);
      const monthlyAmount = activeCharges.reduce((sum, charge) => sum + charge.amount, 0);
      
      totalAmount += monthlyAmount;
      studentPreviews.push({
        id: student.id,
        name: student.name,
        roomNumber: student.room?.roomNumber,
        activeCharges: activeCharges.length,
        monthlyAmount
      });
    }

    return {
      month: this.getMonthName(month),
      year,
      totalAmount,
      totalStudents: activeStudents.length,
      students: studentPreviews
    };
  }

  async getStudentsReadyForBilling(hostelId: string) {
    const students = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.financialInfo', 'financial')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoin('student.invoices', 'invoice')
      .where('student.status = :status', { status: StudentStatus.ACTIVE })
      .andWhere('student.hostelId = :hostelId', { hostelId })
      .andWhere('financial.isActive = :isActive', { isActive: true })
      .getMany();

    return students.map(student => {
      const activeCharges = student.financialInfo.filter(f => f.isActive);
      const monthlyTotal = activeCharges.reduce((sum, charge) => sum + charge.amount, 0);
      
      // Get last invoice date (placeholder - will implement when invoice relations are set up)
      const lastInvoiceDate = null; // student.invoices?.[0]?.createdAt || null;

      return {
        id: student.id,
        name: student.name,
        roomNumber: student.room?.roomNumber,
        monthlyTotal,
        activeCharges: activeCharges.length,
        lastInvoiceDate: lastInvoiceDate ? 
          new Date(lastInvoiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 
          'Never'
      };
    });
  }

  async getBillingHistory(page: number = 1, limit: number = 20, hostelId?: string) {
    const offset = (page - 1) * limit;

    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.student', 'student')
      .leftJoinAndSelect('student.room', 'room')
      .orderBy('invoice.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (hostelId) {
      queryBuilder.andWhere('invoice.hostelId = :hostelId', { hostelId });
    }

    const [invoices, total] = await queryBuilder.getManyAndCount();

    const items = invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentId: invoice.student?.id,
      studentName: invoice.student?.name,
      roomNumber: invoice.student?.room?.roomNumber,
      month: invoice.month,
      amount: invoice.total,
      status: invoice.status,
      generatedDate: invoice.createdAt,
      dueDate: invoice.dueDate,
      paidDate: null // Will be set when payment is made
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 🏨 NEW: Get invoices by specific month for student-wise breakdown
  async getInvoicesByMonth(monthKey: string, hostelId?: string) {
    try {
      console.log(`📋 Getting invoices for month: ${monthKey}, hostelId: ${hostelId}`);
      
      const queryBuilder = this.invoiceRepository
        .createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.student', 'student')
        .leftJoinAndSelect('student.room', 'room')
        .where('invoice.month = :monthKey', { monthKey })
        .orderBy('invoice.createdAt', 'DESC');

      if (hostelId) {
        queryBuilder.andWhere('invoice.hostelId = :hostelId', { hostelId });
      }

      const invoices = await queryBuilder.getMany();
      console.log(`📊 Found ${invoices.length} invoices for month ${monthKey}`);

      return invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentId: invoice.studentId,
        studentName: invoice.student?.name || 'Unknown',
        roomNumber: invoice.student?.room?.roomNumber || 'N/A',
        month: invoice.month,
        totalAmount: parseFloat(invoice.total.toString()),
        status: invoice.status,
        date: invoice.createdAt.toISOString().split('T')[0],
        dueDate: invoice.dueDate?.toISOString().split('T')[0] || null,
        referenceId: invoice.invoiceNumber
      }));
    } catch (error) {
      console.error('Error in getInvoicesByMonth:', error);
      throw error;
    }
  }

  // 🏨 NEW: Nepalese billing system method
  async generateNepalesesMonthlyInvoices(month: number, year: number, dueDate?: Date, hostelId?: string) {
    // Import and properly instantiate the NepalesesBillingService with all required dependencies
    const { NepalesesBillingService } = await import('./services/nepalese-billing.service');
    
    // Create properly injected NepalesesBillingService using injected services
    const nepalesesBillingService = new NepalesesBillingService(
      this.studentRepository,
      this.invoiceRepository,
      this.invoiceItemRepository,
      this.paymentRepository,
      this.financialInfoRepository,
      this.ledgerV2Service,
      this.advancePaymentService
    );

    // Generate invoices using Nepalese billing logic
    return await nepalesesBillingService.generateMonthlyInvoices(month, year, dueDate, hostelId);
  }

  // 🏨 NEW: Get payment due students using Nepalese billing system
  async getPaymentDueStudents(hostelId: string) {
    // Import and properly instantiate the NepalesesBillingService with all required dependencies
    const { NepalesesBillingService } = await import('./services/nepalese-billing.service');
    
    // Create properly injected NepalesesBillingService using injected services
    const nepalesesBillingService = new NepalesesBillingService(
      this.studentRepository,
      this.invoiceRepository,
      this.invoiceItemRepository,
      this.paymentRepository,
      this.financialInfoRepository,
      this.ledgerV2Service,
      this.advancePaymentService
    );

    // Get payment due students using Nepalese billing logic
    return await nepalesesBillingService.getPaymentDueStudents(hostelId);
  }
}