import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { Hostel } from '../hostel/entities/hostel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Hostel
    ]),
    LedgerModule
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}