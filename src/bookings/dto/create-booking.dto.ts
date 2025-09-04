import { IsString, IsNumber, IsOptional, IsDateString, IsEmail, IsPhoneNumber, IsBoolean, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ 
    description: 'Booking ID (optional, auto-generated if not provided)',
    example: 'booking-123',
    required: false
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ 
    description: 'Full name of the person making the booking',
    example: 'John Doe'
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Phone number of the booking person',
    example: '+1234567890'
  })
  @IsString()
  phone: string;

  @ApiProperty({ 
    description: 'Email address of the booking person',
    example: 'john.doe@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'Guardian or parent name (if applicable)',
    example: 'Jane Doe',
    required: false
  })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiProperty({ 
    description: 'Guardian or parent phone number',
    example: '+0987654321',
    required: false
  })
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiProperty({ 
    description: 'Preferred room number or type',
    example: 'Single Room 101',
    required: false
  })
  @IsOptional()
  @IsString()
  preferredRoom?: string;

  @ApiProperty({ 
    description: 'Course or program of study',
    example: 'Computer Science',
    required: false
  })
  @IsOptional()
  @IsString()
  course?: string;

  @ApiProperty({ 
    description: 'Educational institution name',
    example: 'University of Example',
    required: false
  })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiProperty({ 
    description: 'Date when the booking request was made',
    example: '2024-01-15T10:30:00Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @ApiProperty({ 
    description: 'Preferred check-in date',
    example: '2024-02-01T14:00:00Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @ApiProperty({ 
    description: 'Duration of stay in months',
    example: 6,
    minimum: 1,
    maximum: 24,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  @Transform(({ value }) => parseInt(value))
  duration?: number;

  @ApiProperty({ 
    description: 'Booking status',
    example: 'pending',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    required: false
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ 
    description: 'Additional notes or special requests',
    example: 'Requires ground floor room due to mobility issues',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ 
    description: 'Emergency contact phone number',
    example: '+1555123456',
    required: false
  })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiProperty({ 
    description: 'Home address of the booking person',
    example: '123 Main St, City, State 12345',
    required: false
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ 
    description: 'Type of ID proof document',
    example: 'Passport',
    required: false
  })
  @IsOptional()
  @IsString()
  idProofType?: string;

  @ApiProperty({ 
    description: 'ID proof document number',
    example: 'A12345678',
    required: false
  })
  @IsOptional()
  @IsString()
  idProofNumber?: string;

  @ApiProperty({ 
    description: 'Source of the booking request',
    example: 'website',
    enum: ['website', 'mobile_app', 'phone', 'walk_in'],
    required: false
  })
  @IsOptional()
  @IsString()
  source?: string;
}

export class ApproveBookingDto {
  @ApiProperty({ 
    description: 'ID of the person processing the approval',
    example: 'admin-123',
    required: false
  })
  @IsOptional()
  @IsString()
  processedBy?: string;

  @ApiProperty({ 
    description: 'Room assigned to the booking',
    example: 'Room 101',
    required: false
  })
  @IsOptional()
  @IsString()
  assignedRoom?: string;

  @ApiProperty({ 
    description: 'Bed assigned to the booking',
    example: 'B1',
    required: false
  })
  @IsOptional()
  @IsString()
  assignedBed?: string;

  @ApiProperty({ 
    description: 'Whether to create a student record automatically',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  createStudent?: boolean;

  @ApiProperty({ 
    description: 'Additional notes for the approval',
    example: 'Approved with standard rate',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectBookingDto {
  @ApiProperty({ 
    description: 'ID of the person processing the rejection',
    example: 'admin-123',
    required: false
  })
  @IsOptional()
  @IsString()
  processedBy?: string;

  @ApiProperty({ 
    description: 'Reason for rejecting the booking',
    example: 'No available rooms for requested dates'
  })
  @IsString()
  reason: string;

  @ApiProperty({ 
    description: 'Additional notes for the rejection',
    example: 'Suggested alternative dates provided',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}