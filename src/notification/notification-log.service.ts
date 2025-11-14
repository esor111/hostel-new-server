import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  Notification, 
  RecipientType, 
  NotificationCategory, 
  DeliveryStatus 
} from './entities/notification.entity';

export interface CreateNotificationDto {
  recipientType: RecipientType;
  recipientId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  recipientType?: RecipientType;
  recipientId?: string;
  category?: NotificationCategory;
  status?: DeliveryStatus;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class NotificationLogService {
  private readonly logger = new Logger(NotificationLogService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Create a new notification record
   */
  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create({
        ...data,
        status: DeliveryStatus.PENDING,
      });

      const saved = await this.notificationRepository.save(notification);
      this.logger.log(`📝 Created notification: ${saved.id} for ${data.recipientType}:${data.recipientId}`);
      
      return saved;
    } catch (error) {
      this.logger.error(`❌ Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark notification as sent
   */
  async markAsSent(id: string, fcmToken?: string): Promise<void> {
    try {
      const updateData: Partial<Notification> = {
        status: DeliveryStatus.SENT,
        sentAt: new Date(),
      };

      // Store FCM token in metadata if provided
      if (fcmToken) {
        const notification = await this.notificationRepository.findOne({ where: { id } });
        if (notification) {
          updateData.metadata = {
            ...notification.metadata,
            fcmTokenUsed: fcmToken,
          };
        }
      }

      await this.notificationRepository.update({ id }, updateData);
      this.logger.log(`✅ Marked notification ${id} as SENT`);
    } catch (error) {
      this.logger.error(`❌ Failed to mark notification ${id} as sent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark notification as failed
   */
  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({ where: { id } });
      if (notification) {
        await this.notificationRepository.update({ id }, {
          status: DeliveryStatus.FAILED,
          metadata: {
            ...(notification.metadata || {}),
            error: errorMessage,
            failedAt: new Date().toISOString(),
          } as Record<string, any>,
        });
        this.logger.log(`❌ Marked notification ${id} as FAILED: ${errorMessage}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to mark notification ${id} as failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark notification as skipped
   */
  async markAsSkipped(id: string, reason: string): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({ where: { id } });
      if (notification) {
        await this.notificationRepository.update({ id }, {
          status: DeliveryStatus.SKIPPED,
          metadata: {
            ...(notification.metadata || {}),
            skipReason: reason,
            skippedAt: new Date().toISOString(),
          } as Record<string, any>,
        });
        this.logger.log(`⚠️ Marked notification ${id} as SKIPPED: ${reason}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to mark notification ${id} as skipped: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark notification as seen by recipient
   */
  async markAsSeen(id: string, recipientId: string): Promise<boolean> {
    try {
      const result = await this.notificationRepository.update(
        { 
          id: id,
          recipientId: recipientId 
        }, // Ensure only the recipient can mark as seen
        { seenAt: new Date() }
      );

      if (result.affected > 0) {
        this.logger.log(`👁️ Marked notification ${id} as seen by ${recipientId}`);
        return true;
      } else {
        this.logger.warn(`⚠️ Notification ${id} not found or not owned by ${recipientId}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ Failed to mark notification ${id} as seen: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notifications for a recipient
   */
  async getNotifications(filters: NotificationFilters): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

      // Apply filters
      if (filters.recipientType) {
        queryBuilder.andWhere('notification.recipientType = :recipientType', { 
          recipientType: filters.recipientType 
        });
      }

      if (filters.recipientId) {
        queryBuilder.andWhere('notification.recipientId = :recipientId', { 
          recipientId: filters.recipientId 
        });
      }

      if (filters.category) {
        queryBuilder.andWhere('notification.category = :category', { 
          category: filters.category 
        });
      }

      if (filters.status) {
        queryBuilder.andWhere('notification.status = :status', { 
          status: filters.status 
        });
      }

      if (filters.unreadOnly) {
        queryBuilder.andWhere('notification.seenAt IS NULL');
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Get unread count (separate query for efficiency)
      let unreadCount = 0;
      if (filters.recipientId) {
        unreadCount = await this.notificationRepository.count({
          where: {
            recipientId: filters.recipientId,
            recipientType: filters.recipientType,
            seenAt: null,
          },
        });
      }

      // Apply pagination and ordering
      queryBuilder
        .orderBy('notification.createdAt', 'DESC')
        .limit(filters.limit || 50)
        .offset(filters.offset || 0);

      const notifications = await queryBuilder.getMany();

      return {
        notifications,
        total,
        unreadCount,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notification by ID (with recipient validation)
   */
  async getNotificationById(id: string, recipientId?: string): Promise<Notification | null> {
    try {
      const where: any = { id };
      if (recipientId) {
        where.recipientId = recipientId;
      }

      return await this.notificationRepository.findOne({ where });
    } catch (error) {
      this.logger.error(`❌ Failed to get notification ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all notifications as seen for a recipient
   */
  async markAllAsSeen(recipientId: string, recipientType: RecipientType): Promise<number> {
    try {
      const result = await this.notificationRepository.update(
        { 
          recipientId: recipientId, 
          recipientType: recipientType,
          seenAt: null as any // Only update unseen notifications
        },
        { seenAt: new Date() }
      );

      this.logger.log(`👁️ Marked ${result.affected} notifications as seen for ${recipientType}:${recipientId}`);
      return result.affected || 0;
    } catch (error) {
      this.logger.error(`❌ Failed to mark all notifications as seen: ${error.message}`);
      throw error;
    }
  }
}
