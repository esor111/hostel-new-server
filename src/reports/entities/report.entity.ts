import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Hostel } from '../../hostel/entities/hostel.entity';

export enum ReportType {
  FINANCIAL = 'financial',
  LEDGER = 'ledger',
  PAYMENT = 'payment',
  INVOICE = 'invoice',
  STUDENT = 'student',
  ROOM = 'room',
  OCCUPANCY = 'occupancy',
  BOOKING = 'booking'
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json'
}

export enum ReportStatus {
  COMPLETED = 'completed',
  PROCESSING = 'processing',
  FAILED = 'failed',
  QUEUED = 'queued'
}

@Entity('reports')
@Index(['type'])
@Index(['generatedBy'])
@Index(['generatedAt'])
@Index(['status'])
@Index(['isScheduled'])
@Index(['hostelId'])
export class Report extends BaseEntity {
  @Column({ name: 'hostel_id' })
  hostelId: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ReportType
  })
  type: ReportType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'generated_by', length: 100 })
  generatedBy: string;

  @Column({ name: 'generated_at', type: 'timestamp' })
  generatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.PDF
  })
  format: ReportFormat;

  @Column({ name: 'file_path', length: 500, nullable: true })
  filePath: string;

  @Column({ name: 'file_size', length: 20, nullable: true })
  fileSize: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.COMPLETED
  })
  status: ReportStatus;

  @Column({ name: 'is_scheduled', default: false })
  isScheduled: boolean;

  @Column({ name: 'schedule_config', type: 'jsonb', nullable: true })
  scheduleConfig: Record<string, any>;

  @Column({ name: 'execution_time_ms', type: 'int', nullable: true })
  executionTimeMs: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'download_count', type: 'int', default: 0 })
  downloadCount: number;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  // Relations
  @ManyToOne(() => Hostel, hostel => hostel.reports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostel_id' })
  hostel: Hostel;
}