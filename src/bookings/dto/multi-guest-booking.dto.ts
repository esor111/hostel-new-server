import { 
  IsString, 
  IsNumber, 
  IsEmail, 
  IsArray, 
  ValidateNested, 
  IsOptional, 
  Min, 
  Max, 
  IsEnum,
  Length,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
  IsPhoneNumber,
  IsDateString,
  IsUUID,
  registerDecorator,
  ValidationOptions,
  ValidationArguments
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsGenderCompatible } from './validators/gender-compatibility.validator';
import { HasUniqueBedAssignments } from './validators/bed-availability.validator';

export enum GuestGender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export class ContactPersonDto {
  @ApiProperty({ 
    description: 'Contact person name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100
  })
  @IsString({ message: 'Contact person name must be a string' })
  @Length(2, 100, { message: 'Contact person name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ 
    description: 'Contact person phone number',
    example: '+1234567890'
  })
  @IsString({ message: 'Phone number must be a string' })
  @Length(10, 15, { message: 'Phone number must be between 10 and 15 characters' })
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, { 
    message: 'Phone number must be a valid format (e.g., +1234567890 or 1234567890)' 
  })
  @Transform(({ value }) => value?.trim())
  phone: string;

  @ApiProperty({ 
    description: 'Contact person email address',
    example: 'john.doe@example.com'
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Length(5, 100, { message: 'Email must be between 5 and 100 characters' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;
}

export class GuestDto {
  @ApiProperty({ 
    description: 'Bed UUID to assign guest to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid'
  })
  @IsString({ message: 'Bed ID must be a string' })
  @IsUUID(4, { message: 'Bed ID must be a valid UUID' })
  @Transform(({ value }) => value?.trim())
  bedId: string;

  @ApiProperty({ 
    description: 'Guest full name',
    example: 'Jane Smith',
    minLength: 2,
    maxLength: 100
  })
  @IsString({ message: 'Guest name must be a string' })
  @Length(2, 100, { message: 'Guest name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ 
    description: 'Guest age in years',
    example: 25,
    minimum: 1,
    maximum: 120
  })
  @IsNumber({}, { message: 'Age must be a number' })
  @Min(1, { message: 'Age must be at least 1 year' })
  @Max(120, { message: 'Age must not exceed 120 years' })
  @Transform(({ value }) => {
    const parsed = parseInt(value);
    if (isNaN(parsed)) {
      throw new Error('Age must be a valid number');
    }
    return parsed;
  })
  age: number;

  @ApiProperty({ 
    description: 'Guest gender',
    enum: GuestGender,
    example: GuestGender.MALE
  })
  @IsEnum(GuestGender, { 
    message: 'Gender must be one of: Male, Female, Other' 
  })
  gender: GuestGender;

  @ApiProperty({ 
    description: 'Guest phone number (required)',
    example: '+9779876543210'
  })
  @IsString({ message: 'Phone number must be a string' })
  @Length(10, 15, { message: 'Phone number must be between 10 and 15 characters' })
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, { 
    message: 'Phone number must be a valid format' 
  })
  @Transform(({ value }) => value?.trim())
  phone: string;

  @ApiProperty({ 
    description: 'Guest email address (required)',
    example: 'guest@example.com'
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Length(5, 100, { message: 'Email must be between 5 and 100 characters' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ 
    description: 'Guest ID proof type (optional)',
    example: 'Passport',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'ID proof type must be a string' })
  @Length(2, 50, { message: 'ID proof type must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  idProofType?: string;

  @ApiProperty({ 
    description: 'Guest ID proof number (optional)',
    example: 'A12345678',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'ID proof number must be a string' })
  @Length(5, 50, { message: 'ID proof number must be between 5 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  idProofNumber?: string;

  @ApiProperty({ 
    description: 'Guest emergency contact (optional)',
    example: '+1234567890',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Emergency contact must be a string' })
  @Length(10, 15, { message: 'Emergency contact must be between 10 and 15 characters' })
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, { 
    message: 'Emergency contact must be a valid phone number format' 
  })
  @Transform(({ value }) => value?.trim())
  emergencyContact?: string;

  @ApiProperty({ 
    description: 'Additional notes for guest (optional)',
    example: 'Vegetarian diet preference',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @Length(0, 500, { message: 'Notes must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;
}

// Core booking data structure (used internally)
export class MultiGuestBookingDataDto {
  @ApiProperty({ 
    description: 'Contact person details',
    type: ContactPersonDto
  })
  @ValidateNested({ message: 'Contact person details are invalid' })
  @Type(() => ContactPersonDto)
  contactPerson: ContactPersonDto;

  @ApiProperty({ 
    description: 'List of guests to book (minimum 1, maximum 10)',
    type: [GuestDto],
    minItems: 1,
    maxItems: 10
  })
  @IsArray({ message: 'Guests must be an array' })
  @ArrayMinSize(1, { message: 'At least one guest is required' })
  @ArrayMaxSize(10, { message: 'Maximum 10 guests allowed per booking' })
  @ValidateNested({ each: true, message: 'Each guest must have valid details' })
  @Type(() => GuestDto)
  @HasUniqueBedAssignments({ message: 'Each guest must be assigned to a unique bed' })
  guests: GuestDto[];

  @ApiProperty({ 
    description: 'Check-in date (ISO format)',
    example: '2024-01-15',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Check-in date must be a valid ISO date string (YYYY-MM-DD)' })
  checkInDate?: string;

  @ApiProperty({ 
    description: 'Duration of stay',
    example: '1 month',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Duration must be a string' })
  @Length(1, 50, { message: 'Duration must be between 1 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  duration?: string;

  @ApiProperty({ 
    description: 'Additional booking notes',
    example: 'Group booking for conference attendees',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @Length(0, 1000, { message: 'Notes must not exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiProperty({ 
    description: 'Emergency contact for the booking',
    example: '+1234567890',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Emergency contact must be a string' })
  @Length(10, 15, { message: 'Emergency contact must be between 10 and 15 characters' })
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, { 
    message: 'Emergency contact must be a valid phone number format' 
  })
  @Transform(({ value }) => value?.trim())
  emergencyContact?: string;

  @ApiProperty({ 
    description: 'Source of the booking',
    example: 'mobile_app',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Source must be a string' })
  @Length(1, 50, { message: 'Source must be between 1 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  source?: string;

  @ApiProperty({ 
    description: 'Hostel ID for the booking',
    example: 'hostel-123',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Hostel ID must be a string' })
  @Length(1, 100, { message: 'Hostel ID must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  hostelId?: string;
}

// Mobile app specific format with nested data structure
export class CreateMultiGuestBookingDto {
  @ApiProperty({ 
    description: 'Booking data wrapper for mobile app format',
    type: MultiGuestBookingDataDto,
    example: {
      contactPerson: {
        name: 'John Doe',
        phone: '+9779876543210',
        email: 'john.doe@example.com'
      },
      guests: [
        {
          bedId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Alice Smith',
          age: 22,
          gender: 'Female'
        },
        {
          bedId: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Bob Johnson',
          age: 24,
          gender: 'Male'
        }
      ],
      checkInDate: '2024-02-01',
      duration: '6 months',
      notes: 'Group booking for university students',
      emergencyContact: '+9779876543211',
      source: 'mobile_app',
      hostelId: 'hostel-123'
    }
  })
  @ValidateNested({ message: 'Booking data is invalid' })
  @Type(() => MultiGuestBookingDataDto)
  data: MultiGuestBookingDataDto;
}