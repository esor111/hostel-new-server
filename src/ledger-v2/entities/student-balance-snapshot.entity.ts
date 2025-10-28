import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';
import { BalanceType } from '../../ledger/entities/ledger-entry.entity';

@Entity('student_balance_snapshots')
@Unique(['studentId', 'hostelId'])
@Index(['studentId'])
@Index(['hostelId'])
@Index(['lastUpdated'])
export class StudentBalanceSnapshot extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'hostel_id' })
  hostelId: string;

  // Current balance (can be negative)
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDebits: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCredits: number;

  @Column({
    name: 'balance_type',
    type: 'enum',
    enum: BalanceType,
    default: BalanceType.NIL
  })
  balanceType: BalanceType;

  @Column({ name: 'total_entries', type: 'int', default: 0 })
  totalEntries: number;

  @Column({ name: 'last_entry_sequence', type: 'bigint', nullable: true })
  lastEntrySequence: number;

  @Column({ name: 'last_updated', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  @Column({ name: 'snapshot_hash' })
  snapshotHash: string; // For integrity verification

  // Relations
  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => Hostel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostel_id' })
  hostel: Hostel;

  // Helper methods
  get absoluteBalance(): number {
    return Math.abs(this.currentBalance);
  }

  isBalanced(): boolean {
    return Math.abs(this.currentBalance - (this.totalDebits - this.totalCredits)) < 0.01;
  }
}