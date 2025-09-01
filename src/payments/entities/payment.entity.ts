import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';
import { PaymentInvoiceAllocation } from './payment-invoice-allocation.entity';

export enum PaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'Bank Transfer',
  CARD = 'Card',
  ONLINE = 'Online',
  CHEQUE = 'Cheque',
  UPI = 'UPI',
  MOBILE_WALLET = 'Mobile Wallet'
}

export enum PaymentStatus {
  COMPLETED = 'Completed',
  PENDING = 'Pending',
  FAILED = 'Failed',
  CANCELLED = 'Cancelled',
  REFUNDED = 'Refunded'
}

@Entity('payments')
@Index(['studentId'])
@Index(['paymentDate'])
@Index(['paymentMethod'])
@Index(['status'])
@Index(['amount'])
export class Payment extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod
  })
  paymentMethod: PaymentMethod;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  @Column({ length: 255, nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.COMPLETED
  })
  status: PaymentStatus;

  @Column({ name: 'transaction_id', length: 255, nullable: true })
  transactionId: string;

  @Column({ name: 'receipt_number', length: 100, nullable: true })
  receiptNumber: string;

  @Column({ name: 'processed_by', length: 100, default: 'admin' })
  processedBy: string;

  @Column({ name: 'bank_name', length: 100, nullable: true })
  bankName: string;

  @Column({ name: 'cheque_number', length: 50, nullable: true })
  chequeNumber: string;

  @Column({ name: 'cheque_date', type: 'date', nullable: true })
  chequeDate: Date;

  // Computed Properties for API compatibility
  get studentName(): string {
    return this.student?.name || '';
  }

  // Relations
  @ManyToOne(() => Student, student => student.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @OneToMany(() => PaymentInvoiceAllocation, allocation => allocation.payment, { cascade: true })
  invoiceAllocations: PaymentInvoiceAllocation[];

  // Method to get invoice IDs for API compatibility
  get invoiceIds(): string[] {
    return this.invoiceAllocations?.map(allocation => allocation.invoiceId) || [];
  }
}