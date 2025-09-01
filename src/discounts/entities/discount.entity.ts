import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { DiscountType } from './discount-type.entity';
import { BaseEntityWithCustomId } from '../../common/entities/base.entity';

export enum DiscountStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  USED = 'used'
}

export enum DiscountApplication {
  LEDGER = 'ledger',
  INVOICE = 'invoice',
  PAYMENT = 'payment'
}

@Entity('discounts')
@Index(['studentId'])
@Index(['status'])
@Index(['date'])
@Index(['discountTypeId'])
export class Discount extends BaseEntityWithCustomId {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'discount_type_id', nullable: true })
  discountTypeId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 255 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'applied_by', length: 100, default: 'Admin' })
  appliedBy: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: DiscountStatus,
    default: DiscountStatus.ACTIVE
  })
  status: DiscountStatus;

  @Column({
    name: 'applied_to',
    type: 'enum',
    enum: DiscountApplication,
    default: DiscountApplication.LEDGER
  })
  appliedTo: DiscountApplication;

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: Date;

  @Column({ name: 'is_percentage', default: false })
  isPercentage: boolean;

  @Column({ name: 'percentage_value', type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentageValue: number;

  @Column({ name: 'max_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxAmount: number;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string; // Invoice ID, Payment ID, etc.

  // Computed Properties for API compatibility
  get studentName(): string {
    return this.student?.name || '';
  }

  get room(): string {
    return this.student?.room?.roomNumber || '';
  }

  // Relations
  @ManyToOne(() => Student, student => student.discounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => DiscountType, discountType => discountType.discounts, { nullable: true })
  @JoinColumn({ name: 'discount_type_id' })
  discountType: DiscountType;
}