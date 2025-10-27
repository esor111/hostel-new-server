import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentInvoiceAllocation } from './entities/payment-invoice-allocation.entity';
import { Student } from '../students/entities/student.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { Hostel } from '../hostel/entities/hostel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentInvoiceAllocation,
      Student,
      Hostel
    ]),
    LedgerModule // Import LedgerModule for integration
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}