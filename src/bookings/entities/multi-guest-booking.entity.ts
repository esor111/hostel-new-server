import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { BookingGuest } from './booking-guest.entity';

export enum MultiGuestBookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  PARTIALLY_CONFIRMED = 'Partially_Confirmed',
  CANCELLED = 'Cancelled',
  COMPLETED = 'Completed'
}

@Entity('multi_guest_bookings')
@Index(['status'])
@Index(['contactEmail'])
@Index(['contactPhone'])
@Index(['checkInDate'])
export class MultiGuestBooking extends BaseEntity {
  // Contact Person Information
  @Column({ name: 'contact_name', length: 255 })
  contactName: string;

  @Column({ name: 'contact_phone', length: 20 })
  contactPhone: string;

  @Column({ name: 'contact_email', length: 255 })
  contactEmail: string;

  // Booking Details
  @Column({ name: 'check_in_date', type: 'date', nullable: true })
  checkInDate: Date;

  @Column({ length: 50, nullable: true })
  duration: string;

  @Column({
    type: 'enum',
    enum: MultiGuestBookingStatus,
    default: MultiGuestBookingStatus.PENDING
  })
  status: MultiGuestBookingStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'emergency_contact', length: 255, nullable: true })
  emergencyContact: string;

  @Column({ name: 'source', length: 50, default: 'website' })
  source: string;

  @Column({ name: 'total_guests', type: 'int', default: 0 })
  totalGuests: number;

  @Column({ name: 'confirmed_guests', type: 'int', default: 0 })
  confirmedGuests: number;

  @Column({ name: 'booking_reference', length: 50, unique: true })
  bookingReference: string;

  // Processing Information
  @Column({ name: 'processed_by', length: 100, nullable: true })
  processedBy: string;

  @Column({ name: 'processed_date', type: 'timestamp', nullable: true })
  processedDate: Date;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string;

  // Relations
  @OneToMany(() => BookingGuest, (guest) => guest.booking, { cascade: true })
  guests: BookingGuest[];
}