import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Payment, PaymentType, PaymentMethod, PaymentStatus } from '../../payments/entities/payment.entity';
import { LedgerV2Service } from '../../ledger-v2/services/ledger-v2.service';
import { AdvancePaymentService } from './advance-payment.service';

export interface UsageCalculation {
  month: string;
  monthName: string;
  year: number;
  daysInMonth: number;
  daysUsed: number;
  dailyRate: number;
  monthlyFee: number;
  amount: number;
  period: string;
}

export interface CheckoutSettlement {
  studentId: string;
  studentName: string;
  enrollmentDate: string;
  checkoutDate: string;
  totalDaysStayed: number;
  totalPaymentsMade: number;
  totalActualUsage: number;
  refundDue: number;
  additionalDue: number;
  netSettlement: number;
  usageBreakdown: UsageCalculation[];
  paymentBreakdown: Array<{
    paymentId: string;
    paymentType: PaymentType;
    amount: number;
    date: string;
    monthCovered?: string;
  }>;
  settlementSummary: {
    isRefundDue: boolean;
    isAdditionalPaymentDue: boolean;
    settlementAmount: number;
    settlementType: 'REFUND' | 'ADDITIONAL_PAYMENT' | 'BALANCED';
  };
}

@Injectable()
export class CheckoutSettlementService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private ledgerV2Service: LedgerV2Service,
    private advancePaymentService: AdvancePaymentService,
  ) {}

  /**
   * Calculate accurate checkout settlement following Nepalese billing practice
   */
  async calculateCheckoutSettlement(
    studentId: string, 
    checkoutDate: string,
    hostelId: string
  ): Promise<CheckoutSettlement> {
    // Validate inputs
    const student = await this.studentRepository.findOne({
      where: { id: studentId, hostelId }
    });

    if (!student) {
      throw new BadRequestException('Student not found');
    }

    if (!student.enrollmentDate) {
      throw new BadRequestException('Student enrollment date not found');
    }

    const enrollmentDateObj = new Date(student.enrollmentDate);
    const checkoutDateObj = new Date(checkoutDate);

    if (checkoutDateObj <= enrollmentDateObj) {
      throw new BadRequestException('Checkout date must be after enrollment date');
    }

    // Get all payments made by student
    const payments = await this.paymentRepository.find({
      where: { 
        studentId, 
        status: PaymentStatus.COMPLETED 
      },
      order: { paymentDate: 'ASC' }
    });

    // Calculate total payments made
    const totalPaymentsMade = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Get monthly fee calculation
    const feeCalculation = await this.advancePaymentService.calculateMonthlyFee(studentId);

    // Calculate actual usage month by month
    const usageBreakdown = this.calculateMonthlyUsage(
      enrollmentDateObj, 
      checkoutDateObj, 
      feeCalculation.totalMonthlyFee
    );

    const totalActualUsage = usageBreakdown.reduce((sum, usage) => sum + usage.amount, 0);
    const totalDaysStayed = usageBreakdown.reduce((sum, usage) => sum + usage.daysUsed, 0);

    // Calculate settlement
    const netSettlement = totalPaymentsMade - totalActualUsage;
    const refundDue = Math.max(0, netSettlement);
    const additionalDue = Math.max(0, -netSettlement);

    // Prepare payment breakdown
    const paymentBreakdown = payments.map(payment => ({
      paymentId: payment.id,
      paymentType: payment.paymentType,
      amount: Number(payment.amount),
      date: payment.paymentDate.toISOString().split('T')[0],
      monthCovered: payment.monthCovered
    }));

    // Determine settlement type
    let settlementType: 'REFUND' | 'ADDITIONAL_PAYMENT' | 'BALANCED';
    let settlementAmount: number;

    if (Math.abs(netSettlement) < 0.01) { // Allow for minor rounding differences
      settlementType = 'BALANCED';
      settlementAmount = 0;
    } else if (netSettlement > 0) {
      settlementType = 'REFUND';
      settlementAmount = refundDue;
    } else {
      settlementType = 'ADDITIONAL_PAYMENT';
      settlementAmount = additionalDue;
    }

    return {
      studentId,
      studentName: student.name,
      enrollmentDate: enrollmentDateObj.toISOString().split('T')[0],
      checkoutDate: checkoutDateObj.toISOString().split('T')[0],
      totalDaysStayed,
      totalPaymentsMade,
      totalActualUsage: Math.round(totalActualUsage * 100) / 100,
      refundDue: Math.round(refundDue * 100) / 100,
      additionalDue: Math.round(additionalDue * 100) / 100,
      netSettlement: Math.round(netSettlement * 100) / 100,
      usageBreakdown,
      paymentBreakdown,
      settlementSummary: {
        isRefundDue: refundDue > 0,
        isAdditionalPaymentDue: additionalDue > 0,
        settlementAmount: Math.round(settlementAmount * 100) / 100,
        settlementType
      }
    };
  }

  /**
   * Process checkout settlement by creating appropriate payment/refund records
   */
  async processCheckoutSettlement(
    studentId: string,
    checkoutDate: string,
    hostelId: string,
    notes?: string
  ): Promise<{
    success: boolean;
    settlement: CheckoutSettlement;
    paymentId?: string;
    ledgerEntryId?: string;
    message: string;
  }> {
    // Calculate settlement
    const settlement = await this.calculateCheckoutSettlement(studentId, checkoutDate, hostelId);

    let paymentId: string | undefined;
    let ledgerEntryId: string | undefined;
    let message: string;

    if (settlement.settlementSummary.settlementType === 'REFUND') {
      // Create refund payment
      const refundPayment = this.paymentRepository.create({
        studentId,
        hostelId,
        amount: settlement.refundDue,
        paymentType: PaymentType.REFUND,
        paymentMethod: PaymentMethod.CASH, // Default, can be changed
        paymentDate: new Date(checkoutDate),
        status: PaymentStatus.COMPLETED,
        notes: notes || `Checkout refund - ${settlement.totalDaysStayed} days usage`,
        processedBy: 'checkout_settlement_system'
      });

      const savedRefund = await this.paymentRepository.save(refundPayment);
      paymentId = savedRefund.id;

      // Create ledger entry (DEBIT - refund to student)
      const ledgerEntry = await this.ledgerV2Service.createAdjustmentEntry({
        studentId,
        amount: settlement.refundDue,
        description: `Checkout refund - ${settlement.studentName} - Actual usage settlement`,
        type: 'debit'
      }, hostelId);

      ledgerEntryId = ledgerEntry.id;
      message = `Refund of NPR ${settlement.refundDue.toLocaleString()} processed for checkout settlement`;

    } else if (settlement.settlementSummary.settlementType === 'ADDITIONAL_PAYMENT') {
      // Create additional payment due record (this would typically be collected before checkout)
      const additionalPayment = this.paymentRepository.create({
        studentId,
        hostelId,
        amount: settlement.additionalDue,
        paymentType: PaymentType.SETTLEMENT,
        paymentMethod: PaymentMethod.CASH,
        paymentDate: new Date(checkoutDate),
        status: PaymentStatus.COMPLETED,
        notes: notes || `Additional payment for checkout settlement - ${settlement.totalDaysStayed} days usage`,
        processedBy: 'checkout_settlement_system'
      });

      const savedPayment = await this.paymentRepository.save(additionalPayment);
      paymentId = savedPayment.id;

      // Create ledger entry (CREDIT - additional payment from student)
      const ledgerEntry = await this.ledgerV2Service.createAdjustmentEntry({
        studentId,
        amount: settlement.additionalDue,
        description: `Additional payment - ${settlement.studentName} - Checkout settlement`,
        type: 'credit'
      }, hostelId);

      ledgerEntryId = ledgerEntry.id;
      message = `Additional payment of NPR ${settlement.additionalDue.toLocaleString()} recorded for checkout settlement`;

    } else {
      message = `Checkout settlement balanced - no additional payment or refund required`;
    }

    return {
      success: true,
      settlement,
      paymentId,
      ledgerEntryId,
      message
    };
  }

  /**
   * Calculate monthly usage breakdown from enrollment to checkout
   */
  private calculateMonthlyUsage(
    enrollmentDate: Date, 
    checkoutDate: Date, 
    monthlyFee: number
  ): UsageCalculation[] {
    const usage: UsageCalculation[] = [];
    const current = new Date(enrollmentDate);

    while (current <= checkoutDate) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthName = this.getMonthName(month);

      // Get days in this month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // Calculate days used in this month
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      const usageStart = current.getTime() === enrollmentDate.getTime() ? enrollmentDate : monthStart;
      const usageEnd = checkoutDate < monthEnd ? checkoutDate : monthEnd;
      
      // Calculate days used (inclusive of both start and end dates)
      const daysUsed = Math.floor((usageEnd.getTime() - usageStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Calculate daily rate and amount
      const dailyRate = monthlyFee / daysInMonth;
      const amount = dailyRate * daysUsed;

      usage.push({
        month: monthKey,
        monthName,
        year,
        daysInMonth,
        daysUsed,
        dailyRate: Math.round(dailyRate * 100) / 100,
        monthlyFee,
        amount: Math.round(amount * 100) / 100,
        period: `${usageStart.toLocaleDateString()} to ${usageEnd.toLocaleDateString()}`
      });

      // Move to next month
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    return usage;
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

  /**
   * Validate checkout settlement calculation
   */
  async validateSettlement(
    studentId: string, 
    checkoutDate: string,
    hostelId: string
  ): Promise<{
    isValid: boolean;
    issues: string[];
    settlement: CheckoutSettlement;
  }> {
    const issues: string[] = [];
    
    try {
      const settlement = await this.calculateCheckoutSettlement(studentId, checkoutDate, hostelId);
      
      // Validate payment amounts
      if (settlement.totalPaymentsMade <= 0) {
        issues.push('No payments found for student');
      }
      
      // Validate usage calculation
      if (settlement.totalActualUsage <= 0) {
        issues.push('Invalid usage calculation - amount must be positive');
      }
      
      // Validate days calculation
      if (settlement.totalDaysStayed <= 0) {
        issues.push('Invalid days calculation - must be positive');
      }
      
      // Check for reasonable settlement amounts
      const maxReasonableRefund = settlement.totalPaymentsMade;
      if (settlement.refundDue > maxReasonableRefund) {
        issues.push('Refund amount exceeds total payments made');
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        settlement
      };
      
    } catch (error) {
      issues.push(`Settlement calculation failed: ${error.message}`);
      return {
        isValid: false,
        issues,
        settlement: null as any
      };
    }
  }
}