import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Student } from './student.entity';

export enum ContactType {
  GUARDIAN = 'guardian',
  EMERGENCY = 'emergency',
  PARENT = 'parent',
  RELATIVE = 'relative'
}

@Entity('student_contacts')
@Index(['studentId', 'type'])
export class StudentContact extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column({
    type: 'enum',
    enum: ContactType
  })
  type: ContactType;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 100, nullable: true })
  relationship: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Student, student => student.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}