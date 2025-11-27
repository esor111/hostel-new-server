  import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';

@Entity('meal_timings')
@Index(['hostelId'], { unique: true })
export class MealTiming extends BaseEntity {
  // Breakfast timing
  @Column({ type: 'time', nullable: true })
  breakfastStart: string;

  @Column({ type: 'time', nullable: true })
  breakfastEnd: string;

  // Lunch timing
  @Column({ type: 'time', nullable: true })
  lunchStart: string;

  @Column({ type: 'time', nullable: true })
  lunchEnd: string;

  // Snacks timing
  @Column({ type: 'time', nullable: true })
  snacksStart: string;

  @Column({ type: 'time', nullable: true })
  snacksEnd: string;

  // Dinner timing
  @Column({ type: 'time', nullable: true })
  dinnerStart: string;

  @Column({ type: 'time', nullable: true })
  dinnerEnd: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Foreign Key
  @Column({ name: 'hostelId' })
  hostelId: string;

  // Relations - One hostel has one meal timing config
  @OneToOne(() => Hostel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostelId' })
  hostel: Hostel;
}
//docker compose down kaha-notification