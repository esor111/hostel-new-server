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

@Module({
  imports: [TypeOrmModule.forFeature([
    BookingRequest,
    MultiGuestBooking,
    BookingGuest,
    Student,
    Room,
    Bed
  ])],
  controllers: [BookingsController],
  providers: [BookingsService, MultiGuestBookingService],
  exports: [BookingsService, MultiGuestBookingService],
})
export class BookingsModule {}