import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BookingsController } from './bookings.controller';
import { MultiGuestBookingService } from './multi-guest-booking.service';
import { BookingValidationService } from './validation/booking-validation.service';
import { HostelNotificationService } from './hostel-notification.service';
import { ContactPersonService } from './services/contact-person.service';
import { MultiGuestBooking } from './entities/multi-guest-booking.entity';
import { BookingGuest } from './entities/booking-guest.entity';
import { Student } from '../students/entities/student.entity';
import { Room } from '../rooms/entities/room.entity';
import { Bed } from '../rooms/entities/bed.entity';
import { RoomsModule } from '../rooms/rooms.module';
import { HostelModule } from '../hostel/hostel.module';
import { Hostel } from '../hostel/entities/hostel.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MultiGuestBooking,
      BookingGuest,
      Student,
      Room,
      Bed,
      Hostel
    ]),
    HttpModule, // Import HttpModule for notification service and contact person service
    RoomsModule, // Import RoomsModule to access BedSyncService
    HostelModule, // Import HostelModule to access BusinessIntegrationService
    NotificationModule, // Import NotificationModule for unified notifications
  ],
  controllers: [BookingsController],
  providers: [
    MultiGuestBookingService,
    BookingValidationService,
    HostelNotificationService,
    ContactPersonService,
  ],
  exports: [MultiGuestBookingService],
})
export class BookingsModule {}