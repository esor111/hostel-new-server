import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';

export enum DayOfWeek {
  SUNDAY = 'Sunday',
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday'
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  SNACKS = 'snacks',
  DINNER = 'dinner'
}

@Entity('meal_plans')
@Index(['day'])
@Index(['hostelId', 'day'], { unique: true })
export class MealPlan extends BaseEntity {
  @Column({ 
    type: 'enum', 
    enum: DayOfWeek 
  })
  day: DayOfWeek;

  @Column({ type: 'varchar', length: 255 })
  breakfast: string;

  @Column({ type: 'varchar', length: 255 })
  lunch: string;

  @Column({ type: 'varchar', length: 255 })
  snacks: string;

  @Column({ type: 'varchar', length: 255 })
  dinner: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Foreign Key
  @Column({ name: 'hostelId' })
  hostelId: string;

  // Relations
  @ManyToOne(() => Hostel, hostel => hostel.mealPlans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostelId' })
  hostel: Hostel;
}