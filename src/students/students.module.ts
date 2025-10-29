import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { Student } from './entities/student.entity';
import { StudentContact } from './entities/student-contact.entity';
import { StudentAcademicInfo } from './entities/student-academic-info.entity';
import { StudentFinancialInfo } from './entities/student-financial-info.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomsModule } from '../rooms/rooms.module';
import { Hostel } from '../hostel/entities/hostel.entity';
import { AuthModule } from '../auth/auth.module';
import { HostelModule } from '../hostel/hostel.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      StudentContact,
      StudentAcademicInfo,
      StudentFinancialInfo,
      LedgerEntry,
      Room,
      Hostel
    ]),
    RoomsModule,
    AuthModule,
    HostelModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule { }