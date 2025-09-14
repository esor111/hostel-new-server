import { IsString, IsEmail, IsOptional, IsNumber, IsDateString, IsEnum, IsPhoneNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '../entities/student.entity';

export class CreateStudentDto {
  
  @ApiPropertyOptional({
    description: 'Student ID (optional, auto-generated if not provided)',
    example: 'student-123'
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Full name of the student',
    example: 'John Doe'
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Phone number of the student',
    example: '+9779876543210'
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  phone: string;

  @ApiProperty({
    description: 'Email address of the student',
    example: 'john.doe@example.com'
  })
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiPropertyOptional({
    description: 'Room number assigned to the student',
    example: 'R101'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  roomNumber?: string;

  @ApiPropertyOptional({
    description: 'Guardian or parent name',
    example: 'Jane Doe'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  guardianName?: string;

  @ApiPropertyOptional({
    description: 'Guardian or parent phone number',
    example: '+9779876543211'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  guardianPhone?: string;

  @ApiPropertyOptional({
    description: 'Home address of the student',
    example: '123 Main St, Kathmandu, Nepal'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({
    description: 'Base monthly fee for accommodation',
    example: 15000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  baseMonthlyFee?: number;

  @ApiPropertyOptional({
    description: 'Monthly laundry fee',
    example: 500,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  laundryFee?: number;

  @ApiPropertyOptional({
    description: 'Monthly food fee',
    example: 8000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  foodFee?: number;

  @ApiPropertyOptional({
    description: 'Student enrollment date (ISO format)',
    example: '2024-01-15'
  })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @ApiPropertyOptional({
    description: 'Current status of the student',
    enum: StudentStatus,
    example: StudentStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({
    description: 'Emergency contact phone number',
    example: '+9779876543212'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  emergencyContact?: string;

  @ApiPropertyOptional({
    description: 'Course or program of study',
    example: 'Computer Science'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  course?: string;

  @ApiPropertyOptional({
    description: 'Educational institution name',
    example: 'University of Example'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  institution?: string;

  @ApiPropertyOptional({
    description: 'Type of ID proof document',
    example: 'Passport'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  idProofType?: string;

  @ApiPropertyOptional({
    description: 'ID proof document number',
    example: 'A12345678'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  idProofNumber?: string;

  @ApiPropertyOptional({
    description: 'Associated booking request ID',
    example: 'booking-456'
  })
  @IsOptional()
  @IsString()
  bookingRequestId?: string;

  @ApiPropertyOptional({
    description: 'Assigned bed number',
    example: 'bed1'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  bedNumber?: string;
}