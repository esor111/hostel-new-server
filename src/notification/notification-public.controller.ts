import { Controller, Get, Query, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationLogService } from './notification-log.service';
import { RecipientType, NotificationCategory, Notification } from './entities/notification.entity';
import { JwtTokenService } from '../auth/services/jwt-token.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Notifications (Public)')
@Controller('notification/public')
export class NotificationPublicController {
  constructor(
    private readonly notificationLogService: NotificationLogService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  /**
   * Transform notification data to the desired frontend format
   */
  private transformNotificationResponse(
    notifications: Notification[],
    total: number,
    limit: number,
    offset: number,
    recipientId: string,
    recipientType: RecipientType
  ) {
    const transformedData = notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      imageUrl: notification.metadata?.imageUrl || null,
      createdAt: notification.createdAt.toISOString(),
      userId: recipientId,
      meta: {
        tapAction: {
          notificationType: notification.category,
          appMode: recipientType,
          action: {
            page: this.getPageFromCategory(notification.category),
            params: notification.metadata?.actionParams || {}
          }
        }
      }
    }));

    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    const hasNext = currentPage < totalPages;

    return {
      data: transformedData,
      meta: {
        next: hasNext ? {
          page: currentPage + 1,
          limit: limit,
          offset: offset + limit
        } : null,
        count: transformedData.length,
        total: total,
        page: currentPage
      }
    };
  }

  /**
   * Map notification category to appropriate page
   */
  private getPageFromCategory(category: NotificationCategory): string {
    const categoryPageMap = {
      [NotificationCategory.PAYMENT]: 'payment-history',
      [NotificationCategory.BOOKING]: 'my-bookings',
      [NotificationCategory.INVOICE]: 'invoices',
      [NotificationCategory.CONFIGURATION]: 'settings',
      [NotificationCategory.GENERAL]: 'notifications',
      [NotificationCategory.BULK_MESSAGE]: 'messages'
    };

    return categoryPageMap[category] || 'notifications';
  }

  @Get('by-recipient')
  @ApiOperation({
    summary: 'Get notifications by recipientId (No Auth Required)',
    description: 'Get notifications for a specific recipient without authentication. Useful for mobile apps or public access.'
  })
  @ApiQuery({
    name: 'recipientId',
    required: true,
    type: String,
    description: 'The recipient ID (userId) to get notifications for'
  })
  @ApiQuery({
    name: 'recipientType',
    required: false,
    enum: RecipientType,
    description: 'Type of recipient (USER or BUSINESS). Defaults to USER'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: NotificationCategory,
    description: 'Filter by notification category'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of notifications to return (default: 50)'
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of notifications to skip (default: 0)'
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: 'Return only unread notifications (default: false)'
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'notification_123abc',
            title: 'Payment Received',
            message: 'Your payment of NPR 15,000 has been processed',
            imageUrl: 'https://example.com/image.jpg',
            createdAt: '2024-11-14T10:30:00.000Z',
            userId: 'user_456',
            meta: {
              tapAction: {
                notificationType: 'PAYMENT',
                appMode: 'USER',
                action: {
                  page: 'payment-history',
                  params: {
                    paymentId: 'payment_789'
                  }
                }
              }
            }
          }
        ],
        meta: {
          next: null,
          count: 1,
          total: 50,
          page: 1
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters - recipientId is required'
  })
  async getNotificationsByRecipient(
    @Query('recipientId') recipientId?: string,
    @Query('recipientType') recipientType?: RecipientType,
    @Query('category') category?: NotificationCategory,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    // Validate required parameter
    if (!recipientId) {
      throw new BadRequestException('recipientId is required');
    }

    // Default to USER type if not specified
    const finalRecipientType = recipientType || RecipientType.USER;

    // Build filter object
    const filters: any = {
      recipientType: finalRecipientType,
      recipientId,
      limit: limit || 50,
      offset: offset || 0,
      unreadOnly: unreadOnly === true,
    };

    // Add optional category filter
    if (category) {
      filters.category = category;
    }

    // Get notifications from service
    const result = await this.notificationLogService.getNotifications(filters);
    
    // Transform response to desired format
    return this.transformNotificationResponse(
      result.notifications,
      result.total,
      filters.limit,
      filters.offset,
      recipientId,
      finalRecipientType
    );
  }

  @Get('filter')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Filter notifications with JWT token',
    description: 'Filter notifications using JWT token to auto-detect recipient. Requires Authorization header with Bearer token. Recipient info is extracted from token: user.id as recipientId, businessId presence determines if it\'s BUSINESS or USER type.'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: NotificationCategory,
    description: 'Filter by notification category'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of notifications to return (default: 50)'
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of notifications to skip (default: 0)'
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: 'Return only unread notifications (default: false)'
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'notification_123abc',
            title: 'Payment Received',
            message: 'Your payment of NPR 15,000 has been processed',
            imageUrl: 'https://example.com/image.jpg',
            createdAt: '2024-11-14T10:30:00.000Z',
            userId: 'user_456',
            meta: {
              tapAction: {
                notificationType: 'PAYMENT',
                appMode: 'USER',
                action: {
                  page: 'payment-history',
                  params: {
                    paymentId: 'payment_789'
                  }
                }
              }
            }
          }
        ],
        meta: {
          next: null,
          count: 1,
          total: 50,
          page: 1
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter parameters'
  })
  async filterNotifications(
    @Headers('authorization') authorization?: string,
    @Query('category') category?: NotificationCategory,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    // Extract JWT token from Authorization header
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new BadRequestException('Authorization header with Bearer token is required');
    }

    const token = authorization.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify and decode JWT token using existing service
      const payload: JwtPayload = this.jwtTokenService.verifyToken(token);
      
      // Smart recipient detection based on existing pattern
      const recipientId = payload.id; // Always use user.id as recipientId
      const recipientType = this.jwtTokenService.hasBusinessContext(payload) 
        ? RecipientType.BUSINESS 
        : RecipientType.USER;

      // Build filter object with auto-detected recipient info
      const filters: any = {
        recipientType,
        recipientId,
        limit: limit || 50,
        offset: offset || 0,
        unreadOnly: unreadOnly === true,
      };

      // Add optional category filter
      if (category) {
        filters.category = category;
      }

      // Get notifications from service
      const result = await this.notificationLogService.getNotifications(filters);
      
      // Transform response to desired format
      return this.transformNotificationResponse(
        result.notifications,
        result.total,
        filters.limit,
        filters.offset,
        recipientId,
        recipientType
      );
    } catch (error) {
      throw new BadRequestException(`Invalid JWT token: ${error.message}`);
    }
  }

  @Get('mark-seen/:id')
  @ApiOperation({
    summary: 'Mark notification as seen (No Auth Required)',
    description: 'Mark a specific notification as seen by providing notification ID and recipientId'
  })
  @ApiQuery({
    name: 'recipientId',
    required: true,
    type: String,
    description: 'The recipient ID (userId) who is marking the notification as seen'
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as seen successfully',
    schema: {
      example: {
        success: true,
        message: 'Notification marked as seen',
        notificationId: 'notification_123abc'
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or notification not found'
  })
  async markNotificationAsSeenPublic(
    @Query('recipientId') recipientId?: string,
    @Query('id') notificationId?: string,
  ) {
    // Validate required parameters
    if (!recipientId) {
      throw new BadRequestException('recipientId is required');
    }
    if (!notificationId) {
      throw new BadRequestException('notificationId is required');
    }

    try {
      const success = await this.notificationLogService.markAsSeen(notificationId, recipientId);
      
      if (success) {
        return { 
          success: true, 
          message: 'Notification marked as seen',
          notificationId 
        };
      } else {
        return { 
          success: false, 
          message: 'Notification not found or not owned by recipient',
          notificationId 
        };
      }
    } catch (error) {
      throw new BadRequestException(`Failed to mark notification as seen: ${error.message}`);
    }
  }

  @Get('mark-all-seen')
  @ApiOperation({
    summary: 'Mark all notifications as seen (No Auth Required)',
    description: 'Mark all unread notifications as seen for a specific recipient'
  })
  @ApiQuery({
    name: 'recipientId',
    required: true,
    type: String,
    description: 'The recipient ID (userId) whose notifications should be marked as seen'
  })
  @ApiQuery({
    name: 'recipientType',
    required: false,
    enum: RecipientType,
    description: 'Type of recipient (USER or BUSINESS). Defaults to USER'
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as seen successfully',
    schema: {
      example: {
        success: true,
        markedCount: 5,
        message: '5 notifications marked as seen',
        recipientId: 'user_456'
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters'
  })
  async markAllNotificationsAsSeenPublic(
    @Query('recipientId') recipientId?: string,
    @Query('recipientType') recipientType?: RecipientType,
  ) {
    // Validate required parameter
    if (!recipientId) {
      throw new BadRequestException('recipientId is required');
    }

    // Default to USER type if not specified
    const finalRecipientType = recipientType || RecipientType.USER;

    try {
      const markedCount = await this.notificationLogService.markAllAsSeen(recipientId, finalRecipientType);
      
      return { 
        success: true, 
        markedCount, 
        message: `${markedCount} notifications marked as seen`,
        recipientId
      };
    } catch (error) {
      throw new BadRequestException(`Failed to mark notifications as seen: ${error.message}`);
    }
  }
}
