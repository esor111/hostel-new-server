import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Student } from '../students/entities/student.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { StudentFinancialInfo } from '../students/entities/student-financial-info.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Student,
    Invoice,
    InvoiceItem,
    StudentFinancialInfo,
    LedgerEntry
  ])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}