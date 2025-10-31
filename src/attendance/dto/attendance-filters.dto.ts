import { IsOptional, IsString, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CheckInOutStatus, CheckInOutType } from '../entities/student-checkin-checkout.entity';

export class AttendanceFiltersDto {
  @IsUUID()
  hostelId: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsString()
  date?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsString()
  dateFrom?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsString()
  dateTo?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsEnum(CheckInOutStatus)
  status?: CheckInOutStatus;

  @IsOptional()
  @IsEnum(CheckInOutType)
  type?: CheckInOutType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string = 'checkInTime';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
