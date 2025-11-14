import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum RecipientType {
  USER = 'USER',
  BUSINESS = 'BUSINESS'
}

export enum NotificationCategory {
  PAYMENT = 'PAYMENT',
  BOOKING = 'BOOKING',
  CONFIGURATION = 'CONFIGURATION',
  INVOICE = 'INVOICE',
  GENERAL = 'GENERAL',
  BULK_MESSAGE = 'BULK_MESSAGE'
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

@Entity('notifications')
@Index(['recipientType', 'recipientId']) // Query by recipient
@Index(['category'])                     // Filter by type
@Index(['status'])                       // Filter by delivery status
@Index(['seenAt'])                       // Query unread (WHERE seenAt IS NULL)
@Index(['createdAt'])                    // Sort by date
export class Notification extends BaseEntity {
  @Column({ type: 'enum', enum: RecipientType })
  recipientType: RecipientType;

  @Column({ type: 'uuid' })
  @Index()
  recipientId: string;

  @Column({ type: 'enum', enum: NotificationCategory })
  category: NotificationCategory;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  seenAt?: Date;
}
