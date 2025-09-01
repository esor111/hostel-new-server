import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from './student.entity';

@Entity('student_academic_info')
@Index(['studentId'])
@Index(['isActive'])
export class StudentAcademicInfo extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ length: 255 })
  course: string;

  @Column({ length: 255 })
  institution: string;

  @Column({ name: 'academic_year', length: 20, nullable: true })
  academicYear: string;

  @Column({ length: 50, nullable: true })
  semester: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'expected_end_date', type: 'date', nullable: true })
  expectedEndDate: Date;

  @Column({ name: 'student_id_number', length: 100, nullable: true })
  studentIdNumber: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Student, student => student.academicInfo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}