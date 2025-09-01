import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';

export enum AdminChargeType {
  ONE_TIME = 'one-time',
  MONTHLY = 'monthly',
  DAILY = 'daily'
}

export enum AdminChargeStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  CANCELLED = 'cancelled'
}

@Entity('admin_charges')
@Index(['studentId'])
@Index(['status'])
@Index(['chargeType'])
@Index(['dueDate'])
@Index(['createdAt'])
export class AdminCharge extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    name: 'charge_type',
    type: 'enum',
    enum: AdminChargeType,
    default: AdminChargeType.ONE_TIME
  })
  chargeType: AdminChargeType;

  @Column({
    type: 'enum',
    enum: AdminChargeStatus,
    default: AdminChargeStatus.PENDING
  })
  status: AdminChargeStatus;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date;

  @Column({ name: 'applied_date', type: 'date', nullable: true })
  appliedDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurring_months', type: 'int', nullable: true })
  recurringMonths: number;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string;

  @Column({ name: 'created_by', type: 'varchar', length: 100 })
  createdBy: string;

  // Relations
  @ManyToOne(() => Student, student => student.adminCharges, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}