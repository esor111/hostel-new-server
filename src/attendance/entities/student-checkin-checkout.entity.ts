import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';

export enum CheckInOutStatus {
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT'
}

export enum CheckInOutType {
  INITIAL = 'INITIAL',
  MANUAL = 'MANUAL'
}

@Entity('student_checkin_checkout')
@Index(['studentId', 'status']) // For finding active check-ins
@Index(['hostelId', 'checkInTime']) // For report generation
@Index(['studentId', 'checkInTime']) // For student history
export class StudentCheckInOut extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'hostel_id' })
  hostelId: string;

  @Column({ name: 'check_in_time', type: 'timestamp' })
  checkInTime: Date;

  @Column({ name: 'check_out_time', type: 'timestamp', nullable: true })
  checkOutTime: Date;

  @Column({
    type: 'enum',
    enum: CheckInOutStatus,
    default: CheckInOutStatus.CHECKED_IN
  })
  status: CheckInOutStatus;

  @Column({
    type: 'enum',
    enum: CheckInOutType,
    default: CheckInOutType.MANUAL
  })
  type: CheckInOutType;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relations
  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => Hostel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostel_id' })
  hostel: Hostel;
}
