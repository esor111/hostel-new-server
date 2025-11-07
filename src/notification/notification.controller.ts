import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { SendToStudentsDto } from './dto/send-to-students.dto';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@ApiTags('Notifications')
@Controller('notification')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send-to-students')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send notification to multiple students',
    description:
      'Admin can send custom notifications to selected students. ' +
      'This endpoint forwards the request to the notification microservice which handles FCM token lookup and Firebase messaging.',
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
  async sendToStudents(@Body() dto: SendToStudentsDto) {
    return this.notificationService.sendToStudents(dto);
  }
}
