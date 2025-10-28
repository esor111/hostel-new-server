import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';
import { LedgerEntryType, BalanceType } from '../../ledger/entities/ledger-entry.entity';

@Entity('ledger_entries_v2')
@Index(['studentId'])
@Index(['hostelId'])
@Index(['date'])
@Index(['type'])
@Index(['entrySequence'])
@Index(['isReversed'])
export class LedgerEntryV2 extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'hostel_id' })
  hostelId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: LedgerEntryType
  })
  type: LedgerEntryType;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  // Financial fields with precise decimal handling (same as existing)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  credit: number;

  // ✅ CRITICAL: Always store ACTUAL balance (can be negative)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  runningBalance: number; // NEVER use Math.abs()

  @Column({
    name: 'balance_type',
    type: 'enum',
    enum: BalanceType,
    default: BalanceType.NIL
  })
  balanceType: BalanceType;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ✅ ATOMIC: Database-generated sequence (prevents race conditions)
  @Column({
    name: 'entry_sequence',
    type: 'bigint',
    generated: 'increment',
    unique: true
  })
  entrySequence: number;

  // Reversal tracking (same pattern as existing)
  @Column({ name: 'is_reversed', default: false })
  isReversed: boolean;

  @Column({ name: 'reversed_by', length: 50, nullable: true })
  reversedBy: string;

  @Column({ name: 'reversal_date', type: 'date', nullable: true })
  reversalDate: Date;

  // Computed Properties for API compatibility (same as existing)
  get studentName(): string {
    return this.student?.name || '';
  }

  // Relations (same pattern as existing)
  @ManyToOne(() => Hostel, hostel => hostel.ledgerEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostel_id' })
  hostel: Hostel;

  @ManyToOne(() => Student, student => student.ledgerEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}