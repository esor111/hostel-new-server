import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { RoomAmenity } from './room-amenity.entity';

export enum AmenityCategory {
  FURNITURE = 'furniture',
  ELECTRONICS = 'electronics',
  UTILITIES = 'utilities',
  COMFORT = 'comfort',
  SAFETY = 'safety',
  CONNECTIVITY = 'connectivity'
}

@Entity('amenities')
@Index(['name'], { unique: true })
@Index(['category'])
@Index(['isActive'])
export class Amenity extends BaseEntity {
  @Column({ length: 100, unique: true })
  name: string; // Wi-Fi, AC, TV, etc.

  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  // Relations
  @OneToMany(() => RoomAmenity, roomAmenity => roomAmenity.amenity)
  roomAmenities: RoomAmenity[];
}