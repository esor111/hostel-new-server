import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentType, PaymentMethod, PaymentStatus } from '../../payments/entities/payment.entity';
import { Student } from '../entities/student.entity';
import { StudentFinancialInfo, FeeType } from '../entities/student-financial-info.entity';
import { LedgerV2Service } from '../../ledger-v2/services/ledger-v2.service';
import { LedgerEntryType } from '../../ledger/entities/ledger-entry.entity';

export interface AdvancePaymentResult {
  success: boolean;
  paymentId: string;
  amount: number;
  monthCovered: string;
  ledgerEntryId: string;
  message: string;
}

export interface MonthlyFeeCalculation {
  baseMonthlyFee: number;
  laundryFee: number;
  foodFee: number;
  utilitiesFee: number;
  maintenanceFee: number;
  totalMonthlyFee: number;
  breakdown: Array<{
    feeType: FeeType;
    description: string;
    amount: number;
  }>;
}

@Injectable()
export class AdvancePaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StudentFinancialInfo)
    private financialInfoRepository: Repository<StudentFinancialInfo>,
    private ledgerV2Service: LedgerV2Service,
  ) {}

  /**
   * Calculate total monthly fee from student's financial configuration
   */
  async calculateMonthlyFee(studentId: string): Promise<MonthlyFeeCalculation> {
    const financialInfo = await this.financialInfoRepository.find({
      where: { studentId, isActive: true }
    });

    if (financialInfo.length === 0) {
      throw new BadRequestException('No active financial configuration found for student');
    }

    const calculation: MonthlyFeeCalculation = {
      baseMonthlyFee: 0,
      laundryFee: 0,
      foodFee: 0,
      utilitiesFee: 0,
      maintenanceFee: 0,
      totalMonthlyFee: 0,
      breakdown: []
    };

    for (const info of financialInfo) {
      const amount = Number(info.amount);
      
      switch (info.feeType) {
        case FeeType.BASE_MONTHLY:
          calculation.baseMonthlyFee = amount;
          calculation.breakdown.push({
            feeType: info.feeType,
            description: 'Monthly Room Rent',
            amount
          });
          break;
        case FeeType.LAUNDRY:
          calculation.laundryFee = amount;
          calculation.breakdown.push({
            feeType: info.feeType,
            description: 'Laundry Service',
            amount
          });
          break;
        case FeeType.FOOD:
          calculation.foodFee = amount;
          calculation.breakdown.push({
            feeType: info.feeType,
            description: 'Food Service',
            amount
          });
          break;
        case FeeType.UTILITIES:
          calculation.utilitiesFee = amount;
          calculation.breakdown.push({
            feeType: info.feeType,
            description: 'Utilities (WiFi, etc.)',
            amount
          });
          break;
        case FeeType.MAINTENANCE:
          calculation.maintenanceFee = amount;
          calculation.breakdown.push({
            feeType: info.feeType,
            description: 'Maintenance Fee',
            amount
          });
          break;
      }
    }

    calculation.totalMonthlyFee = calculation.baseMonthlyFee + 
                                  calculation.laundryFee + 
                                  calculation.foodFee + 
                                  calculation.utilitiesFee + 
                                  calculation.maintenanceFee;

    if (calculation.totalMonthlyFee <= 0) {
      throw new BadRequestException('Total monthly fee must be greater than zero');
    }

    return calculation;
  }

  /**
   * Process advance payment for newly configured student
   */
  async processAdvancePayment(
    studentId: string, 
    hostelId: string,
    configurationDate: Date = new Date(),
    paymentMethod: PaymentMethod = PaymentMethod.CASH
  ): Promise<AdvancePaymentResult> {
    // Validate student exists and is not already configured with advance payment
    const student = await this.studentRepository.findOne({
      where: { id: studentId, hostelId }
    });

    if (!student) {
      throw new BadRequestException('Student not found');
    }

    if (student.advancePaymentMonth) {
      throw new BadRequestException('Student already has advance payment processed');
    }

    // Calculate monthly fee
    const feeCalculation = await this.calculateMonthlyFee(studentId);

    // Determine month covered by advance payment
    const monthCovered = this.getMonthCovered(configurationDate);

    // Check if advance payment already exists
    const existingAdvancePayment = await this.paymentRepository.findOne({
      where: {
        studentId,
        paymentType: PaymentType.ADVANCE,
        monthCovered
      }
    });

    if (existingAdvancePayment) {
      throw new BadRequestException(`Advance payment already exists for month ${monthCovered}`);
    }

    // Create advance payment record
    const advancePayment = this.paymentRepository.create({
      studentId,
      hostelId,
      amount: feeCalculation.totalMonthlyFee,
      paymentType: PaymentType.ADVANCE,
      paymentMethod,
      paymentDate: configurationDate,
      monthCovered,
      status: PaymentStatus.COMPLETED,
      notes: `Initial advance payment for ${monthCovered} - Configuration date: ${configurationDate.toISOString().split('T')[0]}`,
      processedBy: 'system_configuration'
    });

    const savedPayment = await this.paymentRepository.save(advancePayment);

    // Create ledger entry (CREDIT - student has advance)
    const ledgerEntry = await this.ledgerV2Service.createAdjustmentEntry({
      studentId,
      amount: feeCalculation.totalMonthlyFee,
      description: `Advance payment for ${monthCovered} - ${student.name}`,
      type: 'credit'
    }, hostelId);

    // Update student with advance payment information
    await this.studentRepository.update(studentId, {
      advancePaymentMonth: monthCovered
    });

    return {
      success: true,
      paymentId: savedPayment.id,
      amount: feeCalculation.totalMonthlyFee,
      monthCovered,
      ledgerEntryId: ledgerEntry.id,
      message: `Advance payment of NPR ${feeCalculation.totalMonthlyFee.toLocaleString()} processed for ${monthCovered}`
    };
  }

  /**
   * Get month covered by payment in YYYY-MM format
   */
  private getMonthCovered(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  /**
   * Check if student has advance payment for specific month
   */
  async hasAdvancePaymentForMonth(studentId: string, month: string): Promise<boolean> {
    const student = await this.studentRepository.findOne({
      where: { id: studentId }
    });

    return student?.advancePaymentMonth === month;
  }

  /**
   * Get advance payment details for student
   */
  async getAdvancePaymentDetails(studentId: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: {
        studentId,
        paymentType: PaymentType.ADVANCE
      },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Validate advance payment amount matches current fee configuration
   */
  async validateAdvancePaymentAmount(studentId: string): Promise<{
    isValid: boolean;
    currentFee: number;
    advancePaymentAmount: number;
    difference: number;
  }> {
    const [feeCalculation, advancePayment] = await Promise.all([
      this.calculateMonthlyFee(studentId),
      this.getAdvancePaymentDetails(studentId)
    ]);

    if (!advancePayment) {
      return {
        isValid: false,
        currentFee: feeCalculation.totalMonthlyFee,
        advancePaymentAmount: 0,
        difference: feeCalculation.totalMonthlyFee
      };
    }

    const advanceAmount = Number(advancePayment.amount);
    const difference = Math.abs(feeCalculation.totalMonthlyFee - advanceAmount);

    return {
      isValid: difference < 0.01, // Allow for minor rounding differences
      currentFee: feeCalculation.totalMonthlyFee,
      advancePaymentAmount: advanceAmount,
      difference
    };
  }
}