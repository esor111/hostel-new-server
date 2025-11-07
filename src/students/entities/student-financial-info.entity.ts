import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from './student.entity';

export enum FeeType {
  BASE_MONTHLY = 'base_monthly',
  LAUNDRY = 'laundry',
  FOOD = 'food',
  UTILITIES = 'utilities',
  MAINTENANCE = 'maintenance',
  ADDITIONAL = 'additional'
}

@Entity('student_financial_info')
@Index(['studentId', 'feeType'])
@Index(['isActive'])
export class StudentFinancialInfo extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({
    name: 'fee_type',
    type: 'enum',
    enum: FeeType
  })
  feeType: FeeType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relations
  @ManyToOne(() => Student, student => student.financialInfo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}