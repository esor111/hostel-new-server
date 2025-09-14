import { IsArray, IsString, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PushNotificationTypeEnum } from '../enums/notification-types.enum';

// Remove unused classes since we're not using user/business objects in meta
// class NotificationMetaUser and NotificationMetaBusiness removed

class NotificationMetaBooking {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Check-in date' })
  @IsString()
  checkInDate: string;

  @ApiProperty({ description: 'Guest count', required: false })
  @IsOptional()
  guestCount?: number;
}

class NotificationMeta {
  @ApiProperty({ enum: PushNotificationTypeEnum, description: 'Notification type' })
  @IsEnum(PushNotificationTypeEnum)
  type: PushNotificationTypeEnum;

  @ApiProperty({ type: NotificationMetaBooking, required: false })
  @ValidateNested()
  @Type(() => NotificationMetaBooking)
  @IsOptional()
  booking?: NotificationMetaBooking;
}

export class SendPushNotificationDto {
  @ApiProperty({ 
    type: [String], 
    description: 'Array of user IDs to receive notification',
    required: false 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  receiverUserIds?: string[];

  @ApiProperty({ 
    type: [String], 
    description: 'Array of business IDs to receive notification',
    required: false 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  receiverBusinessIds?: string[];

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiProperty({ enum: PushNotificationTypeEnum, description: 'Notification type' })
  @IsEnum(PushNotificationTypeEnum)
  type: PushNotificationTypeEnum;

  @ApiProperty({ type: NotificationMeta, description: 'Additional notification metadata' })
  @ValidateNested()
  @Type(() => NotificationMeta)
  meta: NotificationMeta;
}

// Simplified DTOs for specific booking notifications
export class BookingNotificationDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  bookingId: string;

  @ApiProperty({ description: 'Contact person user ID' })
  @IsString()
  contactPersonId: string;

  @ApiProperty({ description: 'Hostel business ID' })
  @IsString()
  hostelId: string;

  @ApiProperty({ description: 'Check-in date' })
  @IsString()
  checkInDate: string;

  @ApiProperty({ description: 'Contact person name' })
  @IsString()
  contactName: string;

  @ApiProperty({ description: 'Hostel name' })
  @IsString()
  hostelName: string;

  @ApiProperty({ description: 'Guest count', required: false })
  @IsOptional()
  guestCount?: number;

  @ApiProperty({ description: 'Rejection reason', required: false })
  @IsOptional()
  reason?: string;
}