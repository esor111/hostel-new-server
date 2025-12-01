import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { StudentAttendance } from './entities/student-attendance.entity';
import { StudentCheckInOut } from './entities/student-checkin-checkout.entity';
import { Student } from '../students/entities/student.entity';
import { HostelModule } from '../hostel/hostel.module';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentAttendance,
      StudentCheckInOut,
      Student
    ]),
    HostelModule,
    forwardRef(() => StudentsModule)
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService]
})
export class AttendanceModule {}
