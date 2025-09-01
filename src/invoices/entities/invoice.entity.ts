import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';
import { InvoiceItem } from './invoice-item.entity';
import { PaymentInvoiceAllocation } from '../../payments/entities/payment-invoice-allocation.entity';

export enum InvoiceStatus {
  PAID = 'Paid',
  UNPAID = 'Unpaid',
  PARTIALLY_PAID = 'Partially Paid',
  OVERDUE = 'Overdue',
  CANCELLED = 'Cancelled',
  SENT = 'Sent'
}

@Entity('invoices')
@Index(['studentId'])
@Index(['month'])
@Index(['status'])
@Index(['dueDate'])
export class Invoice extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ length: 20 }) // YYYY-MM format with extra space for safety
  month: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.UNPAID
  })
  status: InvoiceStatus;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'discount_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountTotal: number;

  @Column({ name: 'payment_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  paymentTotal: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'invoice_number', length: 50, nullable: true })
  invoiceNumber: string;

  @Column({ name: 'generated_by', length: 100, default: 'system' })
  generatedBy: string;

  // Computed Properties
  get balanceDue(): number {
    return this.total - this.paymentTotal;
  }

  get studentName(): string {
    return this.student?.name || '';
  }

  get roomNumber(): string {
    return this.student?.room?.roomNumber || '';
  }

  // Relations
  @ManyToOne(() => Student, student => student.invoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @OneToMany(() => InvoiceItem, item => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @OneToMany(() => PaymentInvoiceAllocation, allocation => allocation.invoice)
  paymentAllocations: PaymentInvoiceAllocation[];

  // Method to get payments for API compatibility
  get payments(): any[] {
    return this.paymentAllocations?.map(allocation => ({
      id: allocation.payment.id,
      amount: allocation.allocatedAmount,
      date: allocation.payment.paymentDate,
      method: allocation.payment.paymentMethod
    })) || [];
  }

  // Method to get discounts for API compatibility
  get discounts(): any[] {
    // This will be populated from discount service when needed
    return [];
  }
}