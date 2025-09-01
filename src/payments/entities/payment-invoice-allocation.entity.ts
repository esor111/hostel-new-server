import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Payment } from './payment.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

@Entity('payment_invoice_allocations')
@Index(['paymentId', 'invoiceId'], { unique: true })
@Index(['paymentId'])
@Index(['invoiceId'])
export class PaymentInvoiceAllocation extends BaseEntity {
  @Column({ name: 'payment_id' })
  paymentId: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ name: 'allocated_amount', type: 'decimal', precision: 10, scale: 2 })
  allocatedAmount: number;

  @Column({ name: 'allocation_date', type: 'date', default: () => 'CURRENT_DATE' })
  allocationDate: Date;

  @Column({ name: 'allocated_by', length: 100, default: 'system' })
  allocatedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relations
  @ManyToOne(() => Payment, payment => payment.invoiceAllocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @ManyToOne(() => Invoice, invoice => invoice.paymentAllocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;
}