import { Controller, Post, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationLogService } from './notification-log.service';
import { RecipientType, NotificationCategory } from './entities/notification.entity';

@ApiTags('Notification Tests')
@Controller('notification/test')
export class NotificationTestController {
  constructor(
    private readonly notificationLogService: NotificationLogService,
  ) {}

  @Post('create-sample-notifications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'TEST: Create 10 sample notifications',
    description: 'Creates 10 sample notifications for testing database functionality (NO AUTH REQUIRED)'
  })
  @ApiResponse({
    status: 200,
    description: 'Sample notifications created successfully',
    schema: {
      example: {
        success: true,
        created: 10,
        notifications: [
          {
            id: 'notification_123',
            title: 'Payment Received',
            message: 'Test payment notification',
            category: 'PAYMENT',
            status: 'PENDING'
          }
        ]
      }
    }
  })
  async createSampleNotifications() {
    const sampleNotifications = [];
    const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Test UUID
    const testBusinessId = '550e8400-e29b-41d4-a716-446655440001'; // Test UUID
    
    const categories = [
      NotificationCategory.PAYMENT,
      NotificationCategory.BOOKING,
      NotificationCategory.CONFIGURATION,
      NotificationCategory.INVOICE,
      NotificationCategory.GENERAL,
      NotificationCategory.BULK_MESSAGE
    ];
    
    const titles = [
      'Payment Received',
      'Booking Confirmed', 
      'Configuration Updated',
      'Invoice Generated',
      'General Notification',
      'Bulk Message Sent'
    ];
    
    try {
      // Create 5 user notifications and 5 business notifications
      for (let i = 0; i < 10; i++) {
        const isUser = i < 5;
        const categoryIndex = i % categories.length;
        
        const notification = await this.notificationLogService.createNotification({
          recipientType: isUser ? RecipientType.USER : RecipientType.BUSINESS,
          recipientId: isUser ? testUserId : testBusinessId,
          category: categories[categoryIndex],
          title: `${titles[categoryIndex]} #${i + 1}`,
          message: `This is a test ${categories[categoryIndex].toLowerCase()} notification created at ${new Date().toISOString()}`,
          metadata: {
            testData: true,
            index: i + 1,
            createdBy: 'test-route',
            timestamp: new Date().toISOString()
          }
        });
        
        sampleNotifications.push(notification);
        
        // Mark some as sent for variety
        if (i % 3 === 0) {
          await this.notificationLogService.markAsSent(notification.id, 'test-fcm-token');
        } else if (i % 4 === 0) {
          await this.notificationLogService.markAsFailed(notification.id, 'Test failure reason');
        }
      }
      
      return {
        success: true,
        created: sampleNotifications.length,
        message: `Created ${sampleNotifications.length} sample notifications`,
        notifications: sampleNotifications.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          category: n.category,
          recipientType: n.recipientType,
          status: n.status,
          createdAt: n.createdAt
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create sample notifications'
      };
    }
  }

  @Get('recent-notifications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'TEST: Get recent notifications',
    description: 'Get 10 most recent notifications from database (NO AUTH REQUIRED)'
  })
  @ApiResponse({
    status: 200,
    description: 'Recent notifications retrieved successfully'
  })
  async getRecentNotifications() {
    try {
      const result = await this.notificationLogService.getNotifications({
        limit: 10,
        offset: 0
      });
      
      return {
        success: true,
        total: result.total,
        notifications: result.notifications,
        message: `Retrieved ${result.notifications.length} recent notifications`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve notifications'
      };
    }
  }

  @Get('database-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'TEST: Check notification database status',
    description: 'Check if notification table exists and is accessible (NO AUTH REQUIRED)'
  })
  async checkDatabaseStatus() {
    try {
      // Try to count notifications
      const result = await this.notificationLogService.getNotifications({
        limit: 1,
        offset: 0
      });
      
      return {
        success: true,
        tableExists: true,
        totalNotifications: result.total,
        message: 'Notification table is accessible and working'
      };
    } catch (error) {
      return {
        success: false,
        tableExists: false,
        error: error.message,
        message: 'Notification table is not accessible - migration may be needed'
      };
    }
  }
}
