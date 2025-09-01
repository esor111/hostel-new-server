import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Invoice } from './invoice.entity';

export enum InvoiceItemCategory {
  ACCOMMODATION = 'Accommodation',
  SERVICES = 'Services',
  FOOD = 'Food',
  UTILITIES = 'Utilities',
  OTHER = 'Other'
}

@Entity('invoice_items')
@Index(['invoiceId'])
@Index(['category'])
export class InvoiceItem extends BaseEntity {
  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: InvoiceItemCategory,
    default: InvoiceItemCategory.OTHER
  })
  category: InvoiceItemCategory;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'is_taxable', default: false })
  isTaxable: boolean;

  // Relations
  @ManyToOne(() => Invoice, invoice => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;
}