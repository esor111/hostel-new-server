import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Student } from '../students/entities/student.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { StudentFinancialInfo } from '../students/entities/student-financial-info.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { AuthModule } from '../auth/auth.module';
import { HostelModule } from '../hostel/hostel.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      Invoice,
      InvoiceItem,
      StudentFinancialInfo,
      LedgerEntry
    ]),
    AuthModule,
    HostelModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}