import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { NotificationCommunicationService } from './notification-communication.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [NotificationCommunicationService],
  exports: [NotificationCommunicationService],
})
export class NotificationCommunicationModule {}