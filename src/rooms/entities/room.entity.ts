import { Entity, Column, OneToMany, OneToOne, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';
import { RoomAmenity } from './room-amenity.entity';
import { RoomOccupant } from './room-occupant.entity';
import { RoomLayout } from './room-layout.entity';
import { Building } from './building.entity';
import { RoomType } from './room-type.entity';
import { Bed } from './bed.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';

export enum RoomStatus {
  ACTIVE = 'Active',
  MAINTENANCE = 'Maintenance',
  INACTIVE = 'Inactive',
  RESERVED = 'Reserved'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  MIXED = 'Mixed',
  ANY = 'Any'
}

export enum MaintenanceStatus {
  EXCELLENT = 'Excellent',
  GOOD = 'Good',
  FAIR = 'Fair',
  UNDER_REPAIR = 'Under Repair',
  NEEDS_ATTENTION = 'Needs Attention'
}

@Entity('rooms')
@Index(['roomNumber'], { unique: true })
@Index(['status'])
@Index(['buildingId'])
@Index(['roomTypeId'])
@Index(['gender'])
@Index(['hostelId'])
export class Room extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 20, unique: true })
  roomNumber: string;

  @Column({ type: 'int', default: 1 })
  bedCount: number;

  @Column({ type: 'int', default: 0 })
  occupancy: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyRate: number;

  // Computed property for capacity (same as bedCount for now)
  get capacity(): number {
    return this.bedCount;
  }

  // Computed property for rent (returns stored rate or 0)
  get rent(): number {
    return this.monthlyRate || 0;
  }

  @Column({ type: 'varchar', nullable: true })
  gender: string;

  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  maintenanceStatus: string;

  @Column({ type: 'timestamp', nullable: true })
  lastCleaned: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastMaintenance: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Foreign Keys
  @Column({ name: 'hostel_id' })
  hostelId: string;

  @Column({ nullable: true })
  buildingId: string;

  @Column({ nullable: true })
  roomTypeId: string;

  // availableBeds is a generated column in the database
  get availableBeds(): number {
    return this.bedCount - this.occupancy;
  }

  // Computed Properties
  get isAvailable(): boolean {
    return this.status === 'ACTIVE' && this.availableBeds > 0;
  }

  // Relations
  @ManyToOne(() => Hostel, hostel => hostel.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostel_id' })
  hostel: Hostel;

  @ManyToOne(() => Building, building => building.rooms, { nullable: true })
  @JoinColumn({ name: 'buildingId' })
  building: Building;

  @ManyToOne(() => RoomType, roomType => roomType.rooms, { nullable: true })
  @JoinColumn({ name: 'roomTypeId' })
  roomType: RoomType;

  @OneToMany(() => Student, student => student.room)
  students: Student[];

  @OneToMany(() => RoomAmenity, amenity => amenity.room, { cascade: true })
  amenities: RoomAmenity[];

  @OneToMany(() => RoomOccupant, occupant => occupant.room, { cascade: true })
  occupants: RoomOccupant[];

  @OneToOne(() => RoomLayout, layout => layout.room, { cascade: true })
  layout: RoomLayout;

  @OneToMany(() => Bed, bed => bed.room, { cascade: true })
  beds: Bed[];
}