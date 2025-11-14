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
}
