import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from './student.entity';

@Entity('bed_switch_audit')
@Index(['studentId'])
@Index(['switchDate'])
@Index(['createdAt'])
export class BedSwitchAudit extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'from_bed_id' })
  fromBedId: string;

  @Column({ name: 'to_bed_id' })
  toBedId: string;

  @Column({ name: 'from_room_id' })
  fromRoomId: string;

  @Column({ name: 'to_room_id' })
  toRoomId: string;

  @Column({ name: 'old_rate', type: 'decimal', precision: 10, scale: 2 })
  oldRate: number;

  @Column({ name: 'new_rate', type: 'decimal', precision: 10, scale: 2 })
  newRate: number;

  @Column({ name: 'rate_difference', type: 'decimal', precision: 10, scale: 2 })
  rateDifference: number;

  @Column({ name: 'old_balance', type: 'decimal', precision: 10, scale: 2 })
  oldBalance: number;

  @Column({ name: 'new_balance', type: 'decimal', precision: 10, scale: 2 })
  newBalance: number;

  @Column({ name: 'advance_adjustment', type: 'decimal', precision: 10, scale: 2, default: 0 })
  advanceAdjustment: number;

  @Column({ name: 'switch_date', type: 'date' })
  switchDate: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'financial_snapshot', type: 'jsonb', nullable: true })
  financialSnapshot: any;

  // Relations
  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}
