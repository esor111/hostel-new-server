import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Student } from '../students/entities/student.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { MultiGuestBooking } from '../bookings/entities/multi-guest-booking.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomOccupant } from '../rooms/entities/room-occupant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Student,
    LedgerEntry,
    Payment,
    Invoice,
    MultiGuestBooking,
    Room,
    RoomOccupant
  ])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}