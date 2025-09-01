import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Room } from './room.entity';

export enum BuildingStatus {
  ACTIVE = 'Active',
  MAINTENANCE = 'Maintenance',
  INACTIVE = 'Inactive'
}

@Entity('buildings')
@Index(['name'], { unique: true })
export class Building extends BaseEntity {
  @Column({ length: 255, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'int', nullable: true })
  floors: number;

  @Column({ type: 'int', nullable: true })
  totalRooms: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @OneToMany(() => Room, room => room.building)
  rooms: Room[];
}