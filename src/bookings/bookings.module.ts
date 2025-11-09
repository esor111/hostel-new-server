import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BookingsController } from './bookings.controller';
// Removed: import { BookingsService } from './bookings.service';
import { MultiGuestBookingService } from './multi-guest-booking.service';
// Removed: import { BookingTransformationService } from './booking-transformation.service';
import { BookingValidationService } from './validation/booking-validation.service';
import { HostelNotificationService } from './hostel-notification.service';
// Removed: import { BookingRequest } from './entities/booking-request.entity';
import { MultiGuestBooking } from './entities/multi-guest-booking.entity';
import { BookingGuest } from './entities/booking-guest.entity';
import { Student } from '../students/entities/student.entity';
import { Room } from '../rooms/entities/room.entity';
import { Bed } from '../rooms/entities/bed.entity';
import { RoomsModule } from '../rooms/rooms.module';
import { HostelModule } from '../hostel/hostel.module';
import { Hostel } from '../hostel/entities/hostel.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Removed: BookingRequest,
      MultiGuestBooking,
      BookingGuest,
      Student,
      Room,
      Bed,
      Hostel
    ]),
    HttpModule, // Import HttpModule for notification service
    RoomsModule, // Import RoomsModule to access BedSyncService
    HostelModule, // Import HostelModule to access BusinessIntegrationService
  ],
  controllers: [BookingsController],
  providers: [/* Removed: BookingsService, */ MultiGuestBookingService, /* Removed: BookingTransformationService, */ BookingValidationService, HostelNotificationService],
  exports: [/* Removed: BookingsService, */ MultiGuestBookingService /* Removed: , BookingTransformationService */],
})
export class BookingsModule {}