import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerV2Controller } from './controllers/ledger-v2.controller';
import { LedgerV2Service } from './services/ledger-v2.service';
import { LedgerCalculationService } from './services/ledger-calculation.service';
import { LedgerTransactionService } from './services/ledger-transaction.service';
import { LedgerEntryV2 } from './entities/ledger-entry-v2.entity';
import { StudentBalanceSnapshot } from './entities/student-balance-snapshot.entity';
import { Student } from '../students/entities/student.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AdminCharge } from '../admin-charges/entities/admin-charge.entity';
import { Discount } from '../discounts/entities/discount.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Hostel } from '../hostel/entities/hostel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // New V2 entities
      LedgerEntryV2,
      StudentBalanceSnapshot,
      // Related entities for relationships
      Student,
      Payment,
      AdminCharge,
      Discount,
      Invoice,
      Hostel
    ])
  ],
  controllers: [LedgerV2Controller],
  providers: [
    LedgerV2Service,
    LedgerCalculationService,
    LedgerTransactionService
  ],
  exports: [
    LedgerV2Service,
    LedgerCalculationService,
    LedgerTransactionService
  ]
})
export class LedgerV2Module {}