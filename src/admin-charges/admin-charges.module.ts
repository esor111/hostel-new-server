import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminChargesController } from './admin-charges.controller';
import { AdminChargesService } from './admin-charges.service';
import { AdminCharge } from './entities/admin-charge.entity';
import { Student } from '../students/entities/student.entity';
import { LedgerV2Module } from '../ledger-v2/ledger-v2.module';
import { Hostel } from '../hostel/entities/hostel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminCharge, Student, Hostel]),
    LedgerV2Module,
  ],
  controllers: [AdminChargesController],
  providers: [AdminChargesService],
  exports: [AdminChargesService],
})
export class AdminChargesModule {}