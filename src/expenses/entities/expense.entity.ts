import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';

@Entity('expenses')
@Index(['hostelId'])
@Index(['expenseDate'])
@Index(['category'])
@Index(['createdAt'])
export class Expense extends BaseEntity {
  @Column({ name: 'hostel_id' })
  hostelId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  // Relations
  @ManyToOne(() => Hostel, hostel => hostel.expenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostel_id' })
  hostel: Hostel;
}
