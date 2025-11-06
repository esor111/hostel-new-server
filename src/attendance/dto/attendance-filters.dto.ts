import { IsOptional, IsString, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CheckInOutStatus, CheckInOutType } from '../entities/student-checkin-checkout.entity';

export class AttendanceFiltersDto {
  @ApiProperty({
    description: 'Hostel UUID',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  hostelId: string;

  @ApiProperty({
    description: 'Student UUID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiProperty({
    description: 'Specific date (YYYY-MM-DD)',
    example: '2025-11-06',
    required: false
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({
    description: 'Start date for range (YYYY-MM-DD)',
    example: '2025-11-01',
    required: false
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({
    description: 'End date for range (YYYY-MM-DD)',
    example: '2025-11-06',
    required: false
  })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiProperty({
    description: 'Check-in/out status',
    enum: CheckInOutStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(CheckInOutStatus)
  status?: CheckInOutStatus;

  @ApiProperty({
    description: 'Check-in/out type',
    enum: CheckInOutType,
    required: false
  })
  @IsOptional()
  @IsEnum(CheckInOutType)
  type?: CheckInOutType;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 100,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({
    description: 'Field to sort by',
    example: 'checkInTime',
    default: 'checkInTime',
    required: false
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'checkInTime';

  @ApiProperty({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
