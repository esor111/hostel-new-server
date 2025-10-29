import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';
import { Discount } from './entities/discount.entity';
import { DiscountType } from './entities/discount-type.entity';
import { Student } from '../students/entities/student.entity';
import { LedgerV2Module } from '../ledger-v2/ledger-v2.module';
import { Hostel } from '../hostel/entities/hostel.entity';
import { AuthModule } from '../auth/auth.module';
import { HostelModule } from '../hostel/hostel.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Discount,
      DiscountType,
      Student,
      Hostel
    ]),
    LedgerV2Module,
    AuthModule,
    HostelModule,
  ],
  controllers: [DiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}