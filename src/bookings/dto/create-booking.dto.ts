import { IsString, IsNumber, IsOptional, IsDateString, IsEmail, IsPhoneNumber, IsBoolean, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiPropertyOptional({ 
    description: 'Booking ID (optional, auto-generated if not provided)',
    example: 'booking-123'
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
    example: '+9779876543210'
  })
  @IsString()
  phone: string;

  @ApiProperty({ 
    description: 'Email address of the booking person',
    example: 'john.doe@example.com'
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ 
    description: 'Guardian or parent name (if applicable)',
    example: 'Jane Doe'
  })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional({ 
    description: 'Guardian or parent phone number',
    example: '+9779876543211'
  })
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional({ 
    description: 'Preferred room number or type',
    example: 'Single Room 101'
  })
  @IsOptional()
  @IsString()
  preferredRoom?: string;

  @ApiPropertyOptional({ 
    description: 'Course or program of study',
    example: 'Computer Science'
  })
  @IsOptional()
  @IsString()
  course?: string;

  @ApiPropertyOptional({ 
    description: 'Educational institution name',
    example: 'University of Example'
  })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional({ 
    description: 'Date when the booking request was made',
    example: '2024-01-15T10:30:00Z'
  })
  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @ApiPropertyOptional({ 
    description: 'Preferred check-in date',
    example: '2024-02-01T14:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @ApiPropertyOptional({ 
    description: 'Duration of stay in months',
    example: 6,
    minimum: 1,
    maximum: 24
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  @Transform(({ value }) => parseInt(value))
  duration?: number;

  @ApiPropertyOptional({ 
    description: 'Booking status',
    example: 'pending',
    enum: ['pending', 'approved', 'rejected', 'cancelled']
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ 
    description: 'Additional notes or special requests',
    example: 'Requires ground floor room due to mobility issues'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Emergency contact phone number',
    example: '+9779876543212'
  })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional({ 
    description: 'Home address of the booking person',
    example: '123 Main St, Kathmandu, Nepal'
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ 
    description: 'Type of ID proof document',
    example: 'Passport'
  })
  @IsOptional()
  @IsString()
  idProofType?: string;

  @ApiPropertyOptional({ 
    description: 'ID proof document number',
    example: 'A12345678'
  })
  @IsOptional()
  @IsString()
  idProofNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Source of the booking request',
    example: 'website',
    enum: ['website', 'mobile_app', 'phone', 'walk_in']
  })
  @IsOptional()
  @IsString()
  source?: string;
}

export class ApproveBookingDto {
  @ApiPropertyOptional({ 
    description: 'ID of the person processing the approval',
    example: 'admin-123'
  })
  @IsOptional()
  @IsString()
  processedBy?: string;

  @ApiPropertyOptional({ 
    description: 'Room assigned to the booking',
    example: 'Room 101'
  })
  @IsOptional()
  @IsString()
  assignedRoom?: string;

  @ApiPropertyOptional({ 
    description: 'Bed assigned to the booking',
    example: 'B1'
  })
  @IsOptional()
  @IsString()
  assignedBed?: string;

  @ApiPropertyOptional({ 
    description: 'Whether to create a student record automatically',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  createStudent?: boolean;

  @ApiPropertyOptional({ 
    description: 'Additional notes for the approval',
    example: 'Approved with standard rate'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectBookingDto {
  @ApiPropertyOptional({ 
    description: 'ID of the person processing the rejection',
    example: 'admin-123'
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

  @ApiPropertyOptional({ 
    description: 'Additional notes for the rejection',
    example: 'Suggested alternative dates provided'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}