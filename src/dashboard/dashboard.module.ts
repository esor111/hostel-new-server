import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Student } from '../students/entities/student.entity';
import { LedgerEntryV2 } from '../ledger-v2/entities/ledger-entry-v2.entity';
import { LedgerV2Module } from '../ledger-v2/ledger-v2.module';
import { Payment } from '../payments/entities/payment.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { MultiGuestBooking } from '../bookings/entities/multi-guest-booking.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomOccupant } from '../rooms/entities/room-occupant.entity';
import { AuthModule } from '../auth/auth.module';
import { HostelModule } from '../hostel/hostel.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      LedgerEntryV2,
      Payment,
      Invoice,
      MultiGuestBooking,
      Room,
      RoomOccupant
    ]),
    AuthModule,
    HostelModule,
    LedgerV2Module,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}