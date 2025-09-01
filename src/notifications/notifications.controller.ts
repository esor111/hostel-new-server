import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @ApiQuery({ name: 'recipientId', required: false })
  @ApiQuery({ name: 'recipientType', required: false })
  @ApiQuery({ name: 'isRead', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'priority', required: false })
  async getAllNotifications(
    @Query('recipientId') recipientId?: string,
    @Query('recipientType') recipientType?: string,
    @Query('isRead') isRead?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
  ) {
    try {
      const notifications = await this.notificationsService.getAllNotifications({
        recipientId,
        recipientType,
        isRead: isRead ? isRead === 'true' : undefined,
        category,
        priority
      });
      return {
        success: true,
        data: notifications,
        message: 'Notifications retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Notification statistics retrieved successfully' })
  async getStats(@Query('recipientId') recipientId?: string) {
    try {
      const stats = await this.notificationsService.getStats(recipientId);
      return {
        success: true,
        data: stats,
        message: 'Notification statistics retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications for recipient' })
  @ApiResponse({ status: 200, description: 'Unread notifications retrieved successfully' })
  async getUnreadNotifications(
    @Query('recipientId') recipientId: string,
    @Query('recipientType') recipientType: string
  ) {
    try {
      const notifications = await this.notificationsService.getUnreadNotifications(recipientId, recipientType);
      return {
        success: true,
        data: notifications,
        message: 'Unread notifications retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  async getNotificationById(@Param('id') id: string) {
    try {
      const notification = await this.notificationsService.getNotificationById(id);
      return {
        success: true,
        data: notification,
        message: 'Notification retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.NOT_FOUND
      };
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    try {
      const notification = await this.notificationsService.createNotification(createNotificationDto);
      return {
        success: true,
        data: notification,
        message: 'Notification created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast notification to all recipients' })
  @ApiResponse({ status: 201, description: 'Notification broadcasted successfully' })
  async broadcastNotification(@Body() broadcastData: {
    title: string;
    message: string;
    type?: string;
    category?: string;
    priority?: string;
    recipientType: string;
    actionUrl?: string;
  }) {
    try {
      const notifications = await this.notificationsService.broadcastNotification(broadcastData);
      return {
        success: true,
        data: notifications,
        message: 'Notification broadcasted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id') id: string) {
    try {
      const notification = await this.notificationsService.markAsRead(id);
      return {
        success: true,
        data: notification,
        message: 'Notification marked as read'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Put('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read for recipient' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @Body() markAllData: { recipientId: string; recipientType: string }
  ) {
    try {
      await this.notificationsService.markAllAsRead(markAllData.recipientId, markAllData.recipientType);
      return {
        success: true,
        message: 'All notifications marked as read'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update notification' })
  @ApiResponse({ status: 200, description: 'Notification updated successfully' })
  async updateNotification(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto
  ) {
    try {
      const notification = await this.notificationsService.updateNotification(id, updateNotificationDto);
      return {
        success: true,
        data: notification,
        message: 'Notification updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  async deleteNotification(@Param('id') id: string) {
    try {
      await this.notificationsService.deleteNotification(id);
      return {
        success: true,
        message: 'Notification deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }
}