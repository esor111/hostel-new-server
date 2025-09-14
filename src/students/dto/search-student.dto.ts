import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '../entities/student.entity';

export class SearchStudentDto {
  @ApiPropertyOptional({
    description: 'Search by student name (partial match)',
    example: 'John'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'Search by phone number (partial match)',
    example: '+977'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiPropertyOptional({
    description: 'Search by email address (partial match)',
    example: 'john@example.com'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  email?: string;

  @ApiPropertyOptional({
    description: 'Search by room number',
    example: 'R101'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  roomNumber?: string;

  @ApiPropertyOptional({
    description: 'Filter by student status',
    enum: StudentStatus,
    example: StudentStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({
    description: 'Search by course/program',
    example: 'Computer Science'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  course?: string;

  @ApiPropertyOptional({
    description: 'Search by institution',
    example: 'University of Example'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  institution?: string;

  @ApiPropertyOptional({
    description: 'Enrollment date range start (ISO format)',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  enrollmentDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Enrollment date range end (ISO format)',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  enrollmentDateTo?: string;

  @ApiPropertyOptional({
    description: 'Minimum balance amount',
    example: 0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  balanceMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum balance amount',
    example: 50000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  balanceMax?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 50
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}