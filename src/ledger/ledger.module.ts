import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { Student } from '../students/entities/student.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Discount } from '../discounts/entities/discount.entity';
import { Hostel } from '../hostel/entities/hostel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    LedgerEntry,
    Student,
    Invoice,
    Payment,
    Discount,
    Hostel
  ])],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}