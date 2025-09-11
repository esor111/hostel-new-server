import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
// Removed: import { BookingsService } from './bookings.service';
import { MultiGuestBookingService } from './multi-guest-booking.service';
// Removed: import { BookingTransformationService } from './booking-transformation.service';
import { BookingValidationService } from './validation/booking-validation.service';
// Removed: import { BookingRequest } from './entities/booking-request.entity';
import { MultiGuestBooking } from './entities/multi-guest-booking.entity';
import { BookingGuest } from './entities/booking-guest.entity';
import { Student } from '../students/entities/student.entity';
import { Room } from '../rooms/entities/room.entity';
import { Bed } from '../rooms/entities/bed.entity';
import { RoomsModule } from '../rooms/rooms.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Removed: BookingRequest,
      MultiGuestBooking,
      BookingGuest,
      Student,
      Room,
      Bed
    ]),
    RoomsModule // Import RoomsModule to access BedSyncService
  ],
  controllers: [BookingsController],
  providers: [/* Removed: BookingsService, */ MultiGuestBookingService, /* Removed: BookingTransformationService, */ BookingValidationService],
  exports: [/* Removed: BookingsService, */ MultiGuestBookingService /* Removed: , BookingTransformationService */],
})
export class BookingsModule {}