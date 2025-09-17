import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { MultiGuestBooking } from './multi-guest-booking.entity';
import { Bed } from '../../rooms/entities/bed.entity';

export enum GuestStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  CHECKED_IN = 'Checked_In',
  CHECKED_OUT = 'Checked_Out',
  CANCELLED = 'Cancelled'
}

@Entity('booking_guests')
@Index(['bookingId'])
@Index(['bedId'])
@Index(['status'])
@Index(['gender'])
export class BookingGuest extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'bed_id' })
  bedId: string;

  @Column({ name: 'guest_name', length: 255 })
  guestName: string;

  @Column({ type: 'int' })
  age: number;

  @Column({ length: 10 })
  gender: 'Male' | 'Female' | 'Other';

  @Column({
    type: 'enum',
    enum: GuestStatus,
    default: GuestStatus.PENDING
  })
  status: GuestStatus;

  // Additional guest information
  @Column({ name: 'id_proof_type', length: 50, nullable: true })
  idProofType: string;

  @Column({ name: 'id_proof_number', length: 100, nullable: true })
  idProofNumber: string;

  @Column({ name: 'emergency_contact', length: 255, nullable: true })
  emergencyContact: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Check-in/out tracking
  @Column({ name: 'actual_check_in_date', type: 'timestamp', nullable: true })
  actualCheckInDate: Date;

  @Column({ name: 'actual_check_out_date', type: 'timestamp', nullable: true })
  actualCheckOutDate: Date;

  @Column({ name: 'assigned_room_number', length: 20, nullable: true })
  assignedRoomNumber: string;

  @Column({ name: 'assigned_bed_number', length: 50, nullable: true })
  assignedBedNumber: string;

  // Relations
  @ManyToOne(() => MultiGuestBooking, (booking) => booking.guests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: MultiGuestBooking;

  @ManyToOne(() => Bed, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bed_id' })
  bed: Bed;
}