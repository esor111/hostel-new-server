import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';
import { Discount } from './entities/discount.entity';
import { DiscountType } from './entities/discount-type.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { Hostel } from '../hostel/entities/hostel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Discount,
      DiscountType,
      Hostel
    ]),
    LedgerModule // Import for ledger integration
  ],
  controllers: [DiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}