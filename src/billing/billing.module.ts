import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Student } from '../students/entities/student.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { StudentFinancialInfo } from '../students/entities/student-financial-info.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AuthModule } from '../auth/auth.module';
import { HostelModule } from '../hostel/hostel.module';
import { LedgerV2Module } from '../ledger-v2/ledger-v2.module';
import { StudentsModule } from '../students/students.module';
import { NepalesesBillingService } from './services/nepalese-billing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      Invoice,
      InvoiceItem,
      StudentFinancialInfo,
      LedgerEntry,
      Payment
    ]),
    AuthModule,
    HostelModule,
    LedgerV2Module,
    StudentsModule,
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    NepalesesBillingService
  ],
  exports: [
    BillingService,
    NepalesesBillingService
  ],
})
export class BillingModule {}