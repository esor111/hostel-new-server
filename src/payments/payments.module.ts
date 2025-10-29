import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentInvoiceAllocation } from './entities/payment-invoice-allocation.entity';
import { Student } from '../students/entities/student.entity';
import { LedgerV2Module } from '../ledger-v2/ledger-v2.module';
import { Hostel } from '../hostel/entities/hostel.entity';
import { AuthModule } from '../auth/auth.module';
import { HostelModule } from '../hostel/hostel.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentInvoiceAllocation,
      Student,
      Hostel
    ]),
    LedgerV2Module,
    AuthModule,
    HostelModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}