import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from '../../students/entities/student.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';

export enum AttendanceType {
  INITIAL = 'INITIAL',
  MANUAL = 'MANUAL'
}

@Entity('student_attendance')
@Index(['studentId', 'hostelId', 'date'], { unique: true }) // One attendance per student per day
@Index(['studentId', 'date'])
@Index(['hostelId', 'date'])
export class StudentAttendance extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'hostel_id' })
  hostelId: string;

  @Column({ type: 'date' })
  date: string; // Format: 'YYYY-MM-DD'

  @Column({ name: 'first_check_in_time', type: 'time' })
  firstCheckInTime: string; // Format: 'HH:MM:SS'

  @Column({
    type: 'enum',
    enum: AttendanceType,
    default: AttendanceType.MANUAL
  })
  type: AttendanceType;

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
