import { Entity, Column, OneToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';

export enum BookingStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled',
  EXPIRED = 'Expired'
}

@Entity('booking_requests')
@Index(['status'])
@Index(['requestDate'])
@Index(['checkInDate'])
@Index(['phone'])
@Index(['email'])
export class BookingRequest extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'guardian_name', length: 255, nullable: true })
  guardianName: string;

  @Column({ name: 'guardian_phone', length: 20, nullable: true })
  guardianPhone: string;

  @Column({ name: 'preferred_room', length: 255, nullable: true })
  preferredRoom: string;

  @Column({ length: 255, nullable: true })
  course: string;

  @Column({ length: 255, nullable: true })
  institution: string;

  @Column({ name: 'request_date', type: 'date' })
  requestDate: Date;

  @Column({ name: 'check_in_date', type: 'date', nullable: true })
  checkInDate: Date;

  @Column({ length: 50, nullable: true })
  duration: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING
  })
  status: BookingStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'emergency_contact', length: 20, nullable: true })
  emergencyContact: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'id_proof_type', length: 50, nullable: true })
  idProofType: string;

  @Column({ name: 'id_proof_number', length: 100, nullable: true })
  idProofNumber: string;

  @Column({ name: 'approved_date', type: 'date', nullable: true })
  approvedDate: Date;

  @Column({ name: 'processed_by', length: 100, nullable: true })
  processedBy: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'assigned_room', length: 50, nullable: true })
  assignedRoom: string;

  @Column({ name: 'priority_score', type: 'int', default: 0 })
  priorityScore: number;

  @Column({ name: 'source', length: 50, default: 'website' })
  source: string; // website, phone, walk-in, referral

  // Relations
  @OneToOne(() => Student, student => student.bookingRequest)
  student: Student;
}