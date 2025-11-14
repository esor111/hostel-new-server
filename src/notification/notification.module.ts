import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { UnifiedNotificationService } from './unified-notification.service';
import { NotificationLogService } from './notification-log.service';
import { Student } from '../students/entities/student.entity';
import { Notification } from './entities/notification.entity';
import { HostelModule } from '../hostel/hostel.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
    }),
    ConfigModule,
    TypeOrmModule.forFeature([Student, Notification]),
    HostelModule, // 🔔 Add HostelModule to provide HostelService for the guard
  ],
  controllers: [NotificationController],
  providers: [NotificationService, UnifiedNotificationService, NotificationLogService],
  exports: [NotificationService, UnifiedNotificationService, NotificationLogService], // Export all services
})
export class NotificationModule {}
