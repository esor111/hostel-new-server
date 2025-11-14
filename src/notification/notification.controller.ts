import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Req, Get, Query, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

}
