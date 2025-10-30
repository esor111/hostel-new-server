import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';

export enum LedgerEntryType {
  INVOICE = 'Invoice',
  PAYMENT = 'Payment',
  DISCOUNT = 'Discount',
  ADJUSTMENT = 'Adjustment',
  REFUND = 'Refund',
  PENALTY = 'Penalty',
  CREDIT_NOTE = 'Credit Note',
  DEBIT_NOTE = 'Debit Note',
  ADMIN_CHARGE = 'Admin Charge',
  ADVANCE_PAYMENT = 'Advance Payment',    // NEW: Initial advance payment
  MONTHLY_PAYMENT = 'Monthly Payment',    // NEW: Regular monthly payment
  CHECKOUT_SETTLEMENT = 'Checkout Settlement'  // NEW: Final settlement
}

export enum BalanceType {
  DR = 'Dr',
  CR = 'Cr',
  NIL = 'Nil'
}

@Entity('ledger_entries')
@Index(['studentId'])
@Index(['date'])
@Index(['type'])
@Index(['referenceId'])
@Index(['balanceType'])
@Index(['hostelId'])
export class LedgerEntry extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'hostelId' })
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

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  credit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({
    name: 'balance_type',
    type: 'enum',
    enum: BalanceType,
    default: BalanceType.NIL
  })
  balanceType: BalanceType;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'entry_number', type: 'int', nullable: true })
  entryNumber: number;

  @Column({ name: 'is_reversed', default: false })
  isReversed: boolean;

  @Column({ name: 'reversed_by', length: 50, nullable: true })
  reversedBy: string;

  @Column({ name: 'reversal_date', type: 'date', nullable: true })
  reversalDate: Date;

  // Computed Properties for API compatibility
  get studentName(): string {
    return this.student?.name || '';
  }

  // Relations
  @ManyToOne(() => Hostel, hostel => hostel.ledgerEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostelId' })
  hostel: Hostel;

  @ManyToOne(() => Student, student => student.ledgerEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}