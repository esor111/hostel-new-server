import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminChargesController } from './admin-charges.controller';
import { AdminChargesService } from './admin-charges.service';
import { AdminCharge } from './entities/admin-charge.entity';
import { Student } from '../students/entities/student.entity';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminCharge, Student]),
    LedgerModule,
  ],
  controllers: [AdminChargesController],
  providers: [AdminChargesService],
  exports: [AdminChargesService],
})
export class AdminChargesModule {}