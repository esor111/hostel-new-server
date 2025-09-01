import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Room } from './room.entity';

export enum PricingModel {
  MONTHLY = 'monthly',
  DAILY = 'daily',
  SEMESTER = 'semester',
  ANNUAL = 'annual'
}

@Entity('room_types')
@Index(['name'], { unique: true })
@Index(['isActive'])
export class RoomType extends BaseEntity {
  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  baseMonthlyRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  baseDailyRate: number;

  @Column({ type: 'int', nullable: true })
  defaultBedCount: number;

  @Column({ type: 'int', nullable: true })
  maxOccupancy: number;

  @Column({ type: 'varchar', nullable: true })
  pricingModel: string;

  @Column({ default: true })
  isActive: boolean;

  // Relations
  @OneToMany(() => Room, room => room.roomType)
  rooms: Room[];
}