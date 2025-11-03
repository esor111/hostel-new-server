import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { StudentAttendance } from './entities/student-attendance.entity';
import { StudentCheckInOut } from './entities/student-checkin-checkout.entity';
import { Student } from '../students/entities/student.entity';
import { HostelModule } from '../hostel/hostel.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentAttendance,
      StudentCheckInOut,
      Student
    ]),
    HostelModule
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService]
})
export class AttendanceModule {}
