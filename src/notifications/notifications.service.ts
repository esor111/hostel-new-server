import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, RecipientType, NotificationType, NotificationCategory, NotificationPriority } from './entities/notification.entity';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async getAllNotifications(filters: {
    recipientId?: string;
    recipientType?: string;
    isRead?: boolean;
    category?: string;
    priority?: string;
  }): Promise<Notification[]> {
    const query = this.notificationRepository.createQueryBuilder('notification');

    if (filters.recipientId) {
      query.andWhere('notification.recipientId = :recipientId', { recipientId: filters.recipientId });
    }
    if (filters.recipientType) {
      query.andWhere('notification.recipientType = :recipientType', { recipientType: filters.recipientType });
    }
    if (filters.isRead !== undefined) {
      query.andWhere('notification.isRead = :isRead', { isRead: filters.isRead });
    }
    if (filters.category) {
      query.andWhere('notification.category = :category', { category: filters.category });
    }
    if (filters.priority) {
      query.andWhere('notification.priority = :priority', { priority: filters.priority });
    }

    return await query.orderBy('notification.sentAt', 'DESC').getMany();
  }

  async getStats(recipientId?: string) {
    let query = this.notificationRepository.createQueryBuilder('notification');
    
    if (recipientId) {
      query = query.where('notification.recipientId = :recipientId', { recipientId });
    }

    const totalNotifications = await query.getCount();
    const unreadNotifications = await query.andWhere('notification.isRead = false').getCount();
    const readNotifications = totalNotifications - unreadNotifications;

    return {
      totalNotifications,
      unreadNotifications,
      readNotifications
    };
  }

  async getUnreadNotifications(recipientId: string, recipientType: string): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: [
        { recipientId, recipientType: recipientType as RecipientType, isRead: false },
        { recipientType: RecipientType.ALL, isRead: false }
      ],
      order: { sentAt: 'DESC' }
    });
  }

  async getNotificationById(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      sentAt: new Date()
    });
    return await this.notificationRepository.save(notification);
  }

  async broadcastNotification(broadcastData: {
    title: string;
    message: string;
    type?: string;
    category?: string;
    priority?: string;
    recipientType: string;
    actionUrl?: string;
  }): Promise<Notification[]> {
    const notification = this.notificationRepository.create({
      title: broadcastData.title,
      message: broadcastData.message,
      type: broadcastData.type as NotificationType,
      category: broadcastData.category as NotificationCategory,
      priority: broadcastData.priority as NotificationPriority,
      recipientType: broadcastData.recipientType as RecipientType,
      actionUrl: broadcastData.actionUrl,
      sentAt: new Date()
    });
    
    const savedNotification = await this.notificationRepository.save(notification);
    return [savedNotification];
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.getNotificationById(id);
    notification.isRead = true;
    notification.readAt = new Date();
    return await this.notificationRepository.save(notification);
  }

  async markAllAsRead(recipientId: string, recipientType: string): Promise<void> {
    await this.notificationRepository.update(
      { recipientId, recipientType: recipientType as RecipientType, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  async updateNotification(id: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.getNotificationById(id);
    Object.assign(notification, updateNotificationDto);
    return await this.notificationRepository.save(notification);
  }

  async deleteNotification(id: string): Promise<void> {
    const result = await this.notificationRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
  }
}