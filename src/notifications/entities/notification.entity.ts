import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export enum NotificationCategory {
  BILLING = 'billing',
  MAINTENANCE = 'maintenance',
  GENERAL = 'general',
  REPORTS = 'reports',
  SYSTEM = 'system',
  BOOKING = 'booking',
  SECURITY = 'security',
  INVENTORY = 'inventory',
  EVENTS = 'events'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum RecipientType {
  STUDENT = 'student',
  STAFF = 'staff',
  ALL = 'all'
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ name: 'recipient_id', nullable: true })
  recipientId: string;

  @Column({
    type: 'enum',
    enum: RecipientType,
    name: 'recipient_type'
  })
  recipientType: RecipientType;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
    default: NotificationCategory.GENERAL
  })
  category: NotificationCategory;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM
  })
  priority: NotificationPriority;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'sent_at' })
  sentAt: Date;

  @Column({ name: 'read_at', nullable: true })
  readAt: Date;

  @Column({ name: 'action_url', nullable: true })
  actionUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}