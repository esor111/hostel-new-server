import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Req, Get, Query, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationLogService } from './notification-log.service';
import { SendToStudentsDto } from './dto/send-to-students.dto';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecipientType, NotificationCategory } from './entities/notification.entity';

@ApiTags('Notifications')
@Controller('notification')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationLogService: NotificationLogService,
  ) {}

  @Post('send-to-students')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send notification to multiple students',
    description:
      'Admin can send custom notifications to selected students. ' +
      'Uses the unified notification system for consistent delivery and fallback handling.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification sent successfully',
    schema: {
      example: {
        success: true,
        sent: 5,
        failed: 0,
        skipped: 1,
        details: {
          sentTo: [
            { studentId: 'student_123', userId: 'user_abc', name: 'John Doe' },
          ],
          skipped: [
            { studentId: 'student_789', name: 'Bob', reason: 'No userId' },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 503,
    description: 'Notification server unavailable',
  })
  async sendToStudents(@Body() dto: SendToStudentsDto, @Req() req: any) {
    // 🔔 NEW: Use unified notification approach with admin JWT and hostel context
    const adminJwt = req.user; // JWT payload from auth guard
    const hostelContext = req.hostelContext; // Hostel context from guard
    return this.notificationService.sendToStudentsUnified(dto, adminJwt, hostelContext);
  }

  @Get('my-notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get notifications for current user/business',
    description: 'Returns paginated notifications for the authenticated user or business'
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      example: {
        notifications: [
          {
            id: 'notification_123',
            title: 'Payment Received',
            message: 'Your payment of NPR 15,000 has been processed',
            category: 'PAYMENT',
            status: 'SENT',
            seenAt: null,
            createdAt: '2025-11-14T10:30:00Z'
          }
        ],
        total: 10,
        unreadCount: 3
      }
    }
  })
  async getMyNotifications(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    const user = req.user;
    
    // Determine if this is a user or business request
    const recipientType = user.businessId ? RecipientType.BUSINESS : RecipientType.USER;
    const recipientId = user.businessId || user.id;

    return this.notificationLogService.getNotifications({
      recipientType,
      recipientId,
      limit: limit || 50,
      offset: offset || 0,
      unreadOnly: unreadOnly === true,
    });
  }

  @Patch(':id/seen')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark notification as seen',
    description: 'Mark a specific notification as seen by the current user'
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as seen',
    schema: {
      example: { success: true, message: 'Notification marked as seen' }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found or not owned by user'
  })
  async markNotificationAsSeen(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const recipientId = user.businessId || user.id;
    
    const success = await this.notificationLogService.markAsSeen(id, recipientId);
    
    if (success) {
      return { success: true, message: 'Notification marked as seen' };
    } else {
      return { success: false, message: 'Notification not found or not owned by user' };
    }
  }

  @Patch('mark-all-seen')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all notifications as seen',
    description: 'Mark all unread notifications as seen for the current user'
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as seen',
    schema: {
      example: { success: true, markedCount: 5, message: '5 notifications marked as seen' }
    }
  })
  async markAllNotificationsAsSeen(@Req() req: any) {
    const user = req.user;
    const recipientType = user.businessId ? RecipientType.BUSINESS : RecipientType.USER;
    const recipientId = user.businessId || user.id;
    
    const markedCount = await this.notificationLogService.markAllAsSeen(recipientId, recipientType);
    
    return { 
      success: true, 
      markedCount, 
      message: `${markedCount} notifications marked as seen` 
    };
  }

  // 🆕 USER-ONLY NOTIFICATION ENDPOINTS
  // These endpoints only accept userToken and always treat caller as USER (never business)

  @Get('user-notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get notifications for current user (USER TOKEN ONLY)',
    description: 'Returns paginated notifications for the authenticated user. Only accepts userToken, ignores businessId even if present.'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of notifications to return (default: 50)', example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of notifications to skip (default: 0)', example: 0 })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Return only unread notifications (default: false)', example: true })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by notification category', example: 'BOOKING', enum: ['BOOKING', 'PAYMENT', 'SYSTEM', 'DISCOUNT', 'ADMIN_CHARGE'] })
  @ApiResponse({
    status: 200,
    description: 'User notifications retrieved successfully',
    schema: {
      example: {
        notifications: [
          {
            id: 'notification_123',
            title: 'Booking Confirmed',
            message: 'Your booking request has been confirmed',
            category: 'BOOKING',
            status: 'SENT',
            seenAt: null,
            createdAt: '2025-11-14T10:30:00Z'
          }
        ],
        total: 10,
        unreadCount: 3
      }
    }
  })
  async getUserNotifications(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('category') category?: string,
  ) {
    const user = req.user;
    
    // 🔧 FORCE USER RECIPIENT TYPE - Always use user.id, never businessId
    return this.notificationLogService.getNotifications({
      recipientType: RecipientType.USER,
      recipientId: user.id, // Always use user.id regardless of businessId presence
      limit: limit || 50,
      offset: offset || 0,
      unreadOnly: unreadOnly === true,
      category: category as any,
    });
  }

  @Patch('user-notifications/:id/seen')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark user notification as seen (USER TOKEN ONLY)',
    description: 'Mark a specific notification as seen by the current user. Only accepts userToken.'
  })
  @ApiResponse({
    status: 200,
    description: 'User notification marked as seen',
    schema: {
      example: { success: true, message: 'Notification marked as seen' }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found or not owned by user'
  })
  async markUserNotificationAsSeen(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    
    // 🔧 FORCE USER RECIPIENT - Always use user.id, never businessId
    const success = await this.notificationLogService.markAsSeen(id, user.id);
    
    if (success) {
      return { success: true, message: 'Notification marked as seen' };
    } else {
      return { success: false, message: 'Notification not found or not owned by user' };
    }
  }

  @Patch('user-notifications/mark-all-seen')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all user notifications as seen (USER TOKEN ONLY)',
    description: 'Mark all unread notifications as seen for the current user. Only accepts userToken.'
  })
  @ApiResponse({
    status: 200,
    description: 'All user notifications marked as seen',
    schema: {
      example: { success: true, markedCount: 5, message: '5 notifications marked as seen' }
    }
  })
  async markAllUserNotificationsAsSeen(@Req() req: any) {
    const user = req.user;
    
    // 🔧 FORCE USER RECIPIENT TYPE - Always use user.id, never businessId
    const markedCount = await this.notificationLogService.markAllAsSeen(user.id, RecipientType.USER);
    
    return { 
      success: true, 
      markedCount, 
      message: `${markedCount} notifications marked as seen` 
    };
  }

  @Get('user-notifications/unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get unread notification count for user (USER TOKEN ONLY)',
    description: 'Returns the count of unread notifications for the authenticated user. Only accepts userToken.'
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      example: { unreadCount: 3 }
    }
  })
  async getUserUnreadCount(@Req() req: any) {
    const user = req.user;
    
    // 🔧 FORCE USER RECIPIENT TYPE - Always use user.id, never businessId
    const result = await this.notificationLogService.getNotifications({
      recipientType: RecipientType.USER,
      recipientId: user.id,
      limit: 1, // We only need the count
      offset: 0,
      unreadOnly: true,
    });
    
    return { 
      unreadCount: result.unreadCount 
    };
  }

}
