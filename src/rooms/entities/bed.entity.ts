import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Room } from './room.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';

export enum BedStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  RESERVED = 'Reserved',
  MAINTENANCE = 'Maintenance'
}

@Entity('beds')
@Index(['roomId'])
@Index(['status'])
@Index(['bedIdentifier'])
@Index(['bedNumber'])
@Index(['gender'])
@Index(['hostelId'])
export class Bed extends BaseEntity {
  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ name: 'hostelId' })
  hostelId: string;

  @Column({ name: 'bed_number', length: 10 })
  bedNumber: string;

  @Column({ name: 'bed_identifier', length: 50, unique: true })
  bedIdentifier: string; // e.g., "R01-bed1", "R02-bed1" - globally unique but room-specific --rm

  @Column({
    type: 'enum',
    enum: BedStatus,
    default: BedStatus.AVAILABLE
  })
  status: BedStatus;

  @Column({ length: 10, nullable: true })
  gender: 'Male' | 'Female' | 'Any';

  @Column({ name: 'monthly_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyRate: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Current occupant information
  @Column({ name: 'current_occupant_id', nullable: true })
  currentOccupantId: string;

  @Column({ name: 'current_occupant_name', length: 255, nullable: true })
  currentOccupantName: string;

  @Column({ name: 'occupied_since', type: 'date', nullable: true })
  occupiedSince: Date;

  @Column({ name: 'last_cleaned', type: 'timestamp', nullable: true })
  lastCleaned: Date;

  @Column({ name: 'maintenance_notes', type: 'text', nullable: true })
  maintenanceNotes: string;

  // Relations
  @ManyToOne(() => Room, room => room.beds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => Hostel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostelId' })
  hostel: Hostel;
}