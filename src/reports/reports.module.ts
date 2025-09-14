import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from './entities/report.entity';
import { Student } from '../students/entities/student.entity';
import { Room } from '../rooms/entities/room.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { Discount } from '../discounts/entities/discount.entity';
import { Hostel } from '../hostel/entities/hostel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Report,
    Student,
    Room,
    Invoice,
    Payment,
    LedgerEntry,
    Discount,
    Hostel
  ])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}