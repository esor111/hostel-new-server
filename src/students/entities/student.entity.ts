import { Entity, Column, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Room } from '../../rooms/entities/room.entity';
import { RoomOccupant } from '../../rooms/entities/room-occupant.entity';
import { BookingRequest } from '../../bookings/entities/booking-request.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { LedgerEntry } from '../../ledger/entities/ledger-entry.entity';
import { Discount } from '../../discounts/entities/discount.entity';
import { StudentContact } from './student-contact.entity';
import { StudentAcademicInfo } from './student-academic-info.entity';
import { StudentFinancialInfo } from './student-financial-info.entity';
import { AdminCharge } from '../../admin-charges/entities/admin-charge.entity';

export enum StudentStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  SUSPENDED = 'Suspended',
  GRADUATED = 'Graduated',
  PENDING_CONFIGURATION = 'Pending Configuration'
}

@Entity('students')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true })
@Index(['status'])
@Index(['enrollmentDate'])
export class Student extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 20, unique: true })
  phone: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'enrollment_date', type: 'date', nullable: true })
  enrollmentDate: Date;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ACTIVE
  })
  status: StudentStatus;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'bed_number', nullable: true })
  bedNumber: string;

  @Column({ name: 'is_configured', default: false })
  isConfigured: boolean;


  // Foreign Keys
  @Column({ name: 'room_id', nullable: true })
  roomId: string;

  @Column({ name: 'booking_request_id', nullable: true })
  bookingRequestId: string;

  // Relations
  @ManyToOne(() => Room, room => room.students, { nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => BookingRequest, booking => booking.student, { nullable: true })
  @JoinColumn({ name: 'booking_request_id' })
  bookingRequest: BookingRequest;

  @OneToMany(() => StudentContact, contact => contact.student, { cascade: true })
  contacts: StudentContact[];

  @OneToMany(() => StudentAcademicInfo, academic => academic.student, { cascade: true })
  academicInfo: StudentAcademicInfo[];

  @OneToMany(() => StudentFinancialInfo, financial => financial.student, { cascade: true })
  financialInfo: StudentFinancialInfo[];

  @OneToMany(() => Invoice, invoice => invoice.student)
  invoices: Invoice[];

  @OneToMany(() => Payment, payment => payment.student)
  payments: Payment[];

  @OneToMany(() => LedgerEntry, ledgerEntry => ledgerEntry.student)
  ledgerEntries: LedgerEntry[];

  @OneToMany(() => Discount, discount => discount.student)
  discounts: Discount[];

  @OneToMany(() => RoomOccupant, occupant => occupant.student)
  roomOccupancy: RoomOccupant[];

  @OneToMany(() => AdminCharge, adminCharge => adminCharge.student)
  adminCharges: AdminCharge[];
}