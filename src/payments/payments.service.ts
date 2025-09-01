import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { PaymentInvoiceAllocation } from './entities/payment-invoice-allocation.entity';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentInvoiceAllocation)
    private allocationRepository: Repository<PaymentInvoiceAllocation>,
    private ledgerService: LedgerService,
  ) {}

  async findAll(filters: any = {}) {
    const { 
      page = 1, 
      limit = 50, 
      studentId, 
      paymentMethod,
      dateFrom,
      dateTo,
      search 
    } = filters;
    
    const queryBuilder = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('payment.invoiceAllocations', 'allocations')
      .leftJoinAndSelect('allocations.invoice', 'invoice');
    
    // Apply filters
    if (studentId) {
      queryBuilder.andWhere('payment.studentId = :studentId', { studentId });
    }
    
    if (paymentMethod) {
      queryBuilder.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod });
    }
    
    if (dateFrom) {
      queryBuilder.andWhere('payment.paymentDate >= :dateFrom', { dateFrom });
    }
    
    if (dateTo) {
      queryBuilder.andWhere('payment.paymentDate <= :dateTo', { dateTo });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(student.name ILIKE :search OR payment.reference ILIKE :search OR payment.transactionId ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    
    // Order by payment date
    queryBuilder.orderBy('payment.paymentDate', 'DESC');
    
    const [payments, total] = await queryBuilder.getManyAndCount();
    
    // Transform to API response format
    const transformedItems = payments.map(payment => this.transformToApiResponse(payment));
    
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
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: [
        'student',
        'invoiceAllocations',
        'invoiceAllocations.invoice'
      ]
    });
    
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    
    return this.transformToApiResponse(payment);
  }

  async findByStudentId(studentId: string) {
    const payments = await this.paymentRepository.find({
      where: { studentId },
      relations: [
        'student',
        'invoiceAllocations',
        'invoiceAllocations.invoice'
      ],
      order: { paymentDate: 'DESC' }
    });
    
    return payments.map(payment => this.transformToApiResponse(payment));
  }

  async create(createPaymentDto: any) {
    // Create payment entity - let TypeORM generate UUID automatically
    const payment = this.paymentRepository.create({
      studentId: createPaymentDto.studentId,
      amount: createPaymentDto.amount,
      paymentMethod: createPaymentDto.paymentMethod,
      paymentDate: createPaymentDto.paymentDate || new Date(),
      reference: createPaymentDto.reference,
      notes: createPaymentDto.notes,
      status: createPaymentDto.status || PaymentStatus.COMPLETED,
      transactionId: createPaymentDto.transactionId,
      receiptNumber: createPaymentDto.receiptNumber || this.generateReceiptNumber(),
      processedBy: createPaymentDto.processedBy || 'admin',
      bankName: createPaymentDto.bankName,
      chequeNumber: createPaymentDto.chequeNumber,
      chequeDate: createPaymentDto.chequeDate
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Create ledger entry for completed payments
    if (savedPayment.status === PaymentStatus.COMPLETED) {
      await this.ledgerService.createPaymentEntry(savedPayment);
    }

    // Create invoice allocations if provided
    if (createPaymentDto.invoiceIds && createPaymentDto.invoiceIds.length > 0) {
      await this.allocatePaymentToInvoices(savedPayment.id, createPaymentDto.invoiceIds);
    }

    return this.findOne(savedPayment.id);
  }

  async update(id: string, updatePaymentDto: any) {
    const payment = await this.findOne(id);
    
    // Update main payment entity
    await this.paymentRepository.update(id, {
      amount: updatePaymentDto.amount,
      paymentMethod: updatePaymentDto.paymentMethod,
      paymentDate: updatePaymentDto.paymentDate,
      reference: updatePaymentDto.reference,
      notes: updatePaymentDto.notes,
      status: updatePaymentDto.status,
      transactionId: updatePaymentDto.transactionId,
      bankName: updatePaymentDto.bankName,
      chequeNumber: updatePaymentDto.chequeNumber,
      chequeDate: updatePaymentDto.chequeDate
    });

    return this.findOne(id);
  }

  async getStats() {
    const totalPayments = await this.paymentRepository.count();
    const completedPayments = await this.paymentRepository.count({ 
      where: { status: PaymentStatus.COMPLETED } 
    });
    const pendingPayments = await this.paymentRepository.count({ 
      where: { status: PaymentStatus.PENDING } 
    });
    const failedPayments = await this.paymentRepository.count({ 
      where: { status: PaymentStatus.FAILED } 
    });
    
    const amountResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'totalAmount')
      .addSelect('AVG(payment.amount)', 'averageAmount')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    // Payment method breakdown
    const methodResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.paymentMethod', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(payment.amount)', 'amount')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('payment.paymentMethod')
      .getRawMany();

    const paymentMethods = {};
    methodResult.forEach(row => {
      paymentMethods[row.method] = {
        count: parseInt(row.count),
        amount: parseFloat(row.amount)
      };
    });

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalAmount: parseFloat(amountResult?.totalAmount) || 0,
      averagePaymentAmount: parseFloat(amountResult?.averageAmount) || 0,
      paymentMethods,
      successRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0
    };
  }

  async processBulkPayments(payments: any[]) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const paymentData of payments) {
      try {
        await this.create(paymentData);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          payment: paymentData,
          error: error.message
        });
      }
    }

    return results;
  }

  async allocatePaymentToInvoices(paymentId: string, invoiceAllocations: any[]) {
    // Remove existing allocations
    await this.allocationRepository.delete({ paymentId });

    // Create new allocations
    const allocations = invoiceAllocations.map(allocation => ({
      paymentId,
      invoiceId: allocation.invoiceId,
      allocatedAmount: allocation.amount,
      allocationDate: new Date(),
      allocatedBy: 'system',
      notes: allocation.notes
    }));

    await this.allocationRepository.save(allocations);

    return {
      success: true,
      allocationsCreated: allocations.length
    };
  }

  // Transform normalized data back to exact API format
  private transformToApiResponse(payment: Payment): any {
    // Get invoice IDs from allocations
    const invoiceIds = payment.invoiceAllocations?.map(allocation => allocation.invoiceId) || [];

    // Return EXACT same structure as current JSON
    return {
      id: payment.id,
      studentId: payment.studentId,
      studentName: payment.student?.name || '',
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      reference: payment.reference,
      notes: payment.notes,
      status: payment.status,
      createdBy: payment.processedBy,
      createdAt: payment.createdAt,
      invoiceIds: invoiceIds
    };
  }



  private generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `RCP-${year}${month}-${timestamp}`;
  }

  async getPaymentMethods() {
    return [
      { id: 'cash', name: 'Cash', description: 'Cash payment' },
      { id: 'bank_transfer', name: 'Bank Transfer', description: 'Direct bank transfer' },
      { id: 'cheque', name: 'Cheque', description: 'Cheque payment' },
      { id: 'online', name: 'Online Payment', description: 'Online payment gateway' },
      { id: 'esewa', name: 'eSewa', description: 'eSewa digital wallet' },
      { id: 'khalti', name: 'Khalti', description: 'Khalti digital wallet' },
      { id: 'ime_pay', name: 'IME Pay', description: 'IME Pay digital wallet' }
    ];
  }

  async createBulk(bulkPaymentDto: any) {
    return await this.processBulkPayments(bulkPaymentDto.payments);
  }

  async remove(id: string) {
    const payment = await this.findOne(id);
    
    // Soft delete - mark as cancelled
    await this.paymentRepository.update(id, {
      status: PaymentStatus.CANCELLED
    });

    return {
      success: true,
      message: 'Payment cancelled successfully',
      paymentId: id
    };
  }

  async getMonthlyPaymentSummary(months: number = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const monthlyData = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'EXTRACT(YEAR FROM payment.paymentDate) as year',
        'EXTRACT(MONTH FROM payment.paymentDate) as month',
        'COUNT(*) as count',
        'SUM(payment.amount) as amount'
      ])
      .where('payment.paymentDate >= :startDate', { startDate })
      .andWhere('payment.paymentDate <= :endDate', { endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('EXTRACT(YEAR FROM payment.paymentDate), EXTRACT(MONTH FROM payment.paymentDate)')
      .orderBy('year, month')
      .getRawMany();

    // Format the data
    return monthlyData.map(data => ({
      month: new Date(data.year, data.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      count: parseInt(data.count),
      amount: parseFloat(data.amount) || 0
    }));
  }
}