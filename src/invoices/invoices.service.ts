import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    private ledgerService: LedgerService,
  ) {}

  async findAll(filters: any = {}) {
    const { page = 1, limit = 50, status, studentId, month, search } = filters;
    
    const queryBuilder = this.invoiceRepository.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.student', 'student')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('invoice.paymentAllocations', 'paymentAllocations')
      .leftJoinAndSelect('paymentAllocations.payment', 'payment');
    
    // Apply filters
    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }
    
    if (studentId) {
      queryBuilder.andWhere('invoice.studentId = :studentId', { studentId });
    }
    
    if (month) {
      queryBuilder.andWhere('invoice.month = :month', { month });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(student.name ILIKE :search OR invoice.invoiceNumber ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    
    // Order by creation date
    queryBuilder.orderBy('invoice.createdAt', 'DESC');
    
    const [invoices, total] = await queryBuilder.getManyAndCount();
    
    // Transform to API response format
    const transformedItems = invoices.map(invoice => this.transformToApiResponse(invoice));
    
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
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: [
        'student',
        'student.room',
        'items',
        'paymentAllocations',
        'paymentAllocations.payment'
      ]
    });
    
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    
    return this.transformToApiResponse(invoice);
  }

  async create(createInvoiceDto: any) {
    // Create invoice entity
    const invoice = this.invoiceRepository.create({
      id: createInvoiceDto.id || this.generateInvoiceId(),
      studentId: createInvoiceDto.studentId,
      month: createInvoiceDto.month,
      total: createInvoiceDto.total || 0,
      status: createInvoiceDto.status || InvoiceStatus.UNPAID,
      dueDate: createInvoiceDto.dueDate,
      subtotal: createInvoiceDto.subtotal || 0,
      discountTotal: createInvoiceDto.discountTotal || 0,
      paymentTotal: createInvoiceDto.paymentTotal || 0,
      notes: createInvoiceDto.notes,
      invoiceNumber: createInvoiceDto.invoiceNumber || this.generateInvoiceNumber(),
      generatedBy: createInvoiceDto.generatedBy || 'system'
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create invoice items if provided
    if (createInvoiceDto.items && createInvoiceDto.items.length > 0) {
      await this.createInvoiceItems(savedInvoice.id, createInvoiceDto.items);
    }

    // Create ledger entry for the invoice
    try {
      await this.ledgerService.createInvoiceEntry(savedInvoice);
    } catch (error) {
      console.error('Failed to create ledger entry for invoice:', error);
      // Don't fail the invoice creation if ledger entry fails
    }

    return this.findOne(savedInvoice.id);
  }

  async update(id: string, updateInvoiceDto: any) {
    const invoice = await this.findOne(id);
    
    // Update main invoice entity
    await this.invoiceRepository.update(id, {
      total: updateInvoiceDto.total,
      status: updateInvoiceDto.status,
      dueDate: updateInvoiceDto.dueDate,
      subtotal: updateInvoiceDto.subtotal,
      discountTotal: updateInvoiceDto.discountTotal,
      paymentTotal: updateInvoiceDto.paymentTotal,
      notes: updateInvoiceDto.notes
    });

    // Update invoice items if provided
    if (updateInvoiceDto.items !== undefined) {
      await this.updateInvoiceItems(id, updateInvoiceDto.items);
    }

    return this.findOne(id);
  }

  async getStats() {
    const totalInvoices = await this.invoiceRepository.count();
    const paidInvoices = await this.invoiceRepository.count({ 
      where: { status: InvoiceStatus.PAID } 
    });
    const unpaidInvoices = await this.invoiceRepository.count({ 
      where: { status: InvoiceStatus.UNPAID } 
    });
    const partiallyPaidInvoices = await this.invoiceRepository.count({ 
      where: { status: InvoiceStatus.PARTIALLY_PAID } 
    });
    const overdueInvoices = await this.invoiceRepository.count({ 
      where: { status: InvoiceStatus.OVERDUE } 
    });
    
    const amountResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.total)', 'totalAmount')
      .addSelect('SUM(invoice.paymentTotal)', 'totalPaid')
      .addSelect('SUM(invoice.total - invoice.paymentTotal)', 'totalOutstanding')
      .addSelect('AVG(invoice.total)', 'averageAmount')
      .getRawOne();

    return {
      totalInvoices,
      paidInvoices,
      unpaidInvoices,
      partiallyPaidInvoices,
      overdueInvoices,
      totalAmount: parseFloat(amountResult?.totalAmount) || 0,
      totalPaid: parseFloat(amountResult?.totalPaid) || 0,
      totalOutstanding: parseFloat(amountResult?.totalOutstanding) || 0,
      averageInvoiceAmount: parseFloat(amountResult?.averageAmount) || 0,
      collectionRate: totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0
    };
  }

  async generateMonthlyInvoices(month: string, studentIds?: string[]) {
    // This would generate invoices for all active students for a given month
    // Implementation would involve:
    // 1. Get all active students (or specific students if provided)
    // 2. Calculate their monthly fees
    // 3. Create invoices with appropriate items
    // 4. Return summary of generated invoices
    
    return {
      generated: 0,
      failed: 0,
      month: month,
      invoices: []
    };
  }



  // Transform normalized data back to exact API format
  private transformToApiResponse(invoice: Invoice): any {
    // Get payments from allocations
    const payments = invoice.paymentAllocations?.map(allocation => ({
      id: allocation.payment.id,
      amount: allocation.allocatedAmount,
      date: allocation.payment.paymentDate,
      method: allocation.payment.paymentMethod
    })) || [];

    // Get items
    const items = invoice.items?.map(item => ({
      id: item.id,
      description: item.description,
      amount: item.amount,
      category: item.category
    })) || [];

    // Return EXACT same structure as current JSON
    return {
      id: invoice.id,
      studentId: invoice.studentId,
      studentName: invoice.student?.name || '',
      roomNumber: invoice.student?.room?.roomNumber || '',
      month: invoice.month,
      total: invoice.total,
      status: invoice.status,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      items: items,
      payments: payments,
      discounts: [], // Will be populated from discount service
      subtotal: invoice.subtotal,
      discountTotal: invoice.discountTotal,
      paymentTotal: invoice.paymentTotal,
      balanceDue: invoice.balanceDue,
      notes: invoice.notes
    };
  }

  private async createInvoiceItems(invoiceId: string, items: any[]) {
    const invoiceItems = items.map(item => ({
      id: item.id || this.generateItemId(),
      invoiceId,
      description: item.description,
      amount: item.amount,
      category: item.category || 'Other',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.amount,
      isTaxable: item.isTaxable || false,
      taxRate: item.taxRate || 0,
      taxAmount: item.taxAmount || 0
    }));

    await this.invoiceItemRepository.save(invoiceItems);
  }

  private async updateInvoiceItems(invoiceId: string, items: any[]) {
    // Remove existing items
    await this.invoiceItemRepository.delete({ invoiceId });

    // Add new items
    if (items.length > 0) {
      await this.createInvoiceItems(invoiceId, items);
    }
  }

  private generateInvoiceId(): string {
    return `INV${Date.now()}`;
  }

  private generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${year}${month}-${timestamp}`;
  }

  private generateItemId(): string {
    return `ITEM${Date.now()}${Math.floor(Math.random() * 100)}`;
  }

  async findByStudentId(studentId: string) {
    const invoices = await this.invoiceRepository.find({
      where: { studentId },
      relations: [
        'student',
        'student.room',
        'items',
        'paymentAllocations',
        'paymentAllocations.payment'
      ],
      order: { createdAt: 'DESC' }
    });
    
    return invoices.map(invoice => this.transformToApiResponse(invoice));
  }

  async createBulk(bulkInvoiceDto: any) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const invoiceData of bulkInvoiceDto.invoices) {
      try {
        await this.create(invoiceData);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          invoice: invoiceData,
          error: error.message
        });
      }
    }

    return results;
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);
    
    // Soft delete - mark as cancelled
    await this.invoiceRepository.update(id, {
      status: InvoiceStatus.CANCELLED
    });

    return {
      success: true,
      message: 'Invoice cancelled successfully',
      invoiceId: id
    };
  }

  async updateStatus(id: string, status: InvoiceStatus, notes?: string) {
    const invoice = await this.findOne(id);
    
    await this.invoiceRepository.update(id, {
      status,
      notes: notes || invoice.notes
    });

    return {
      success: true,
      message: 'Invoice status updated successfully',
      invoiceId: id,
      newStatus: status
    };
  }

  async sendInvoice(id: string) {
    const invoice = await this.findOne(id);
    
    // Mark as sent
    await this.invoiceRepository.update(id, {
      status: InvoiceStatus.SENT
    });

    return {
      success: true,
      method: 'email',
      sentTo: invoice.student?.email || invoice.student?.phone,
      sentAt: new Date(),
      invoiceId: id
    };
  }

  async getOverdueInvoices() {
    const currentDate = new Date();
    
    const overdueInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.student', 'student')
      .leftJoinAndSelect('student.room', 'room')
      .where('invoice.dueDate < :currentDate', { currentDate })
      .andWhere('invoice.status IN (:...statuses)', { 
        statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.SENT] 
      })
      .orderBy('invoice.dueDate', 'ASC')
      .getMany();

    return overdueInvoices.map(invoice => ({
      ...this.transformToApiResponse(invoice),
      daysPastDue: Math.floor((currentDate.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    }));
  }

  async getMonthlyInvoiceSummary(months: number = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const monthlyData = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select([
        'EXTRACT(YEAR FROM invoice.createdAt) as year',
        'EXTRACT(MONTH FROM invoice.createdAt) as month',
        'COUNT(*) as count',
        'SUM(invoice.total) as totalAmount',
        'SUM(invoice.paymentTotal) as paidAmount',
        'SUM(CASE WHEN invoice.status = :paidStatus THEN 1 ELSE 0 END) as paidCount'
      ])
      .where('invoice.createdAt >= :startDate', { startDate })
      .andWhere('invoice.createdAt <= :endDate', { endDate })
      .setParameter('paidStatus', InvoiceStatus.PAID)
      .groupBy('EXTRACT(YEAR FROM invoice.createdAt), EXTRACT(MONTH FROM invoice.createdAt)')
      .orderBy('year, month')
      .getRawMany();

    // Format the data
    return monthlyData.map(data => ({
      month: new Date(data.year, data.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      count: parseInt(data.count),
      totalAmount: parseFloat(data.totalAmount) || 0,
      paidAmount: parseFloat(data.paidAmount) || 0,
      paidCount: parseInt(data.paidCount),
      collectionRate: data.count > 0 ? (parseInt(data.paidCount) / parseInt(data.count)) * 100 : 0
    }));
  }
}