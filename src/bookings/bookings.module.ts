import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { MultiGuestBookingService } from './multi-guest-booking.service';
import { BookingRequest } from './entities/booking-request.entity';
import { MultiGuestBooking } from './entities/multi-guest-booking.entity';
import { BookingGuest } from './entities/booking-guest.entity';
import { Student } from '../students/entities/student.entity';
import { Room } from '../rooms/entities/room.entity';
import { Bed } from '../rooms/entities/bed.entity';
import { RoomsModule } from '../rooms/rooms.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingRequest,
      MultiGuestBooking,
      BookingGuest,
      Student,
      Room,
      Bed
    ]),
    RoomsModule, // Import RoomsModule to access BedSyncService
    NotificationsModule // Import NotificationsModule to access NotificationsService
  ],
  controllers: [BookingsController],
  providers: [BookingsService, MultiGuestBookingService],
  exports: [BookingsService, MultiGuestBookingService],
})
export class BookingsModule {}