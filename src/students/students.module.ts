import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { Student } from './entities/student.entity';
import { StudentContact } from './entities/student-contact.entity';
import { StudentAcademicInfo } from './entities/student-academic-info.entity';
import { StudentFinancialInfo } from './entities/student-financial-info.entity';
import { BedSwitchAudit } from './entities/bed-switch-audit.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomOccupant } from '../rooms/entities/room-occupant.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Bed } from '../rooms/entities/bed.entity';
import { RoomsModule } from '../rooms/rooms.module';
import { Hostel } from '../hostel/entities/hostel.entity';
import { AuthModule } from '../auth/auth.module';
import { HostelModule } from '../hostel/hostel.module';
import { LedgerV2Module } from '../ledger-v2/ledger-v2.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { AdvancePaymentService } from './services/advance-payment.service';
import { CheckoutSettlementService } from './services/checkout-settlement.service';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      StudentContact,
      StudentAcademicInfo,
      StudentFinancialInfo,
      BedSwitchAudit,
      LedgerEntry,
      Room,
      RoomOccupant,
      Payment,
      Bed,
      Hostel
    ]),
    RoomsModule,
    AuthModule,
    HostelModule,
    LedgerV2Module,
    AttendanceModule,
    InvoicesModule,
  ],
  controllers: [StudentsController],
  providers: [
    StudentsService,
    AdvancePaymentService,
    CheckoutSettlementService
  ],
  exports: [
    StudentsService,
    AdvancePaymentService,
    CheckoutSettlementService
  ],
})
export class StudentsModule { }