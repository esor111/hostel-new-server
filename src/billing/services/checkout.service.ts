import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from '../../students/entities/student.entity';
import { Payment, PaymentType, PaymentStatus } from '../../payments/entities/payment.entity';
import { InvoicesService } from '../../invoices/invoices.service';

export interface CheckoutResult {
  studentId: string;
  studentName: string;
  configurationDate: Date;
  outstandingInvoices: Array<{
    id: string;
    periodLabel: string;
    amount: number;
    dueDate: Date;
    daysPastDue: number;
  }>;
  totalDues: number;
  advancePayments: Array<{
    id: string;
    amount: number;
    date: Date;
    notes: string;
  }>;
  totalAdvance: number;
  finalAmount: number;
  refundAmount: number;
  status: 'AMOUNT_DUE' | 'REFUND_DUE' | 'SETTLED';
  summary: string;
}

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private invoicesService: InvoicesService,
  ) {}

  /**
   * Calculate checkout settlement: Total dues - Advance credit = Final amount
   */
  async calculateCheckout(studentId: string, hostelId: string): Promise<CheckoutResult> {
    // Validate student exists
    const student = await this.studentRepository.findOne({
      where: { id: studentId, hostelId }
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get all outstanding configuration-based invoices
    const outstandingInvoices = await this.invoicesService.getOutstandingDues(studentId, hostelId);
    const currentDate = new Date();
    
    const invoiceDetails = outstandingInvoices.map(invoice => ({
      id: invoice.id,
      periodLabel: invoice.periodLabel || `${invoice.periodStart?.toLocaleDateString()} - ${invoice.periodEnd?.toLocaleDateString()}`,
      amount: invoice.balanceDue || (invoice.total - invoice.paymentTotal),
      dueDate: new Date(invoice.dueDate),
      daysPastDue: Math.max(0, Math.floor((currentDate.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
    }));

    const totalDues = invoiceDetails.reduce((sum, invoice) => sum + invoice.amount, 0);

    // Get all advance payments (credit balance)
    const advancePayments = await this.paymentRepository.find({
      where: {
        studentId,
        hostelId,
        paymentType: PaymentType.ADVANCE,
        status: PaymentStatus.COMPLETED
      },
      order: { paymentDate: 'ASC' }
    });

    const advanceDetails = advancePayments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      date: payment.paymentDate,
      notes: payment.notes || 'Advance payment'
    }));

    const totalAdvance = advancePayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate final settlement
    const finalAmount = totalDues - totalAdvance;
    const refundAmount = finalAmount < 0 ? Math.abs(finalAmount) : 0;
    const amountDue = finalAmount > 0 ? finalAmount : 0;

    // Determine status
    let status: 'AMOUNT_DUE' | 'REFUND_DUE' | 'SETTLED';
    let summary: string;

    if (finalAmount > 0) {
      status = 'AMOUNT_DUE';
      summary = `Student owes NPR ${amountDue.toLocaleString()}`;
    } else if (finalAmount < 0) {
      status = 'REFUND_DUE';
      summary = `Refund due: NPR ${refundAmount.toLocaleString()}`;
    } else {
      status = 'SETTLED';
      summary = 'Account settled - no amount due or refund';
    }

    return {
      studentId,
      studentName: student.name,
      configurationDate: student.enrollmentDate || student.createdAt,
      outstandingInvoices: invoiceDetails,
      totalDues,
      advancePayments: advanceDetails,
      totalAdvance,
      finalAmount: amountDue,
      refundAmount,
      status,
      summary
    };
  }

  /**
   * Process actual checkout (mark student as checked out)
   */
  async processCheckout(studentId: string, hostelId: string): Promise<CheckoutResult> {
    const checkoutCalculation = await this.calculateCheckout(studentId, hostelId);
    
    // Update student status to checked out
    await this.studentRepository.update(studentId, {
      status: StudentStatus.GRADUATED
    });

    console.log(`🏁 Checkout processed for ${checkoutCalculation.studentName}`);
    console.log(`📊 Final Settlement: ${checkoutCalculation.summary}`);

    return checkoutCalculation;
  }

  /**
   * Get total advance credit balance for a student
   */
  async getTotalAdvanceCredit(studentId: string, hostelId: string): Promise<number> {
    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'totalAdvance')
      .where('payment.studentId = :studentId', { studentId })
      .andWhere('payment.hostelId = :hostelId', { hostelId })
      .andWhere('payment.paymentType = :paymentType', { paymentType: PaymentType.ADVANCE })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();
      
    return parseFloat(result?.totalAdvance) || 0;
  }
}