import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { NotificationCommunicationService } from './notification-communication.service';
import { HostelModule } from '../hostel/hostel.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    HostelModule, // Import HostelModule to use HostelService
  ],
  providers: [NotificationCommunicationService],
  exports: [NotificationCommunicationService],
})
export class NotificationCommunicationModule {}