import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  PARTIALLY_CONFIRMED = 'Partially_Confirmed',
  CANCELLED = 'Cancelled',
  COMPLETED = 'Completed'
}

export enum BookingSortBy {
  CREATED_AT = 'createdAt',
  CONTACT_NAME = 'contactName',
  STATUS = 'status',
  TOTAL_GUESTS = 'totalGuests',
  CHECK_IN_DATE = 'checkInDate'
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

export class QueryMultiGuestBookingDto {
  @ApiProperty({ 
    description: 'Filter by booking status',
    enum: BookingStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(BookingStatus, { message: 'Status must be a valid booking status' })
  status?: BookingStatus;

  @ApiProperty({ 
    description: 'Filter by contact person name (partial match)',
    example: 'John',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Contact name must be a string' })
  @Transform(({ value }) => value?.trim())
  contactName?: string;

  @ApiProperty({ 
    description: 'Filter by contact email (partial match)',
    example: 'john@example.com',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Contact email must be a string' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  contactEmail?: string;

  @ApiProperty({ 
    description: 'Filter by contact phone (partial match)',
    example: '1234567890',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Contact phone must be a string' })
  @Transform(({ value }) => value?.trim())
  contactPhone?: string;

  @ApiProperty({ 
    description: 'Filter by booking source',
    example: 'mobile_app',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Source must be a string' })
  @Transform(({ value }) => value?.trim())
  source?: string;

  @ApiProperty({ 
    description: 'Filter by minimum number of guests',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: 'Minimum guests must be a number' })
  @Min(1, { message: 'Minimum guests must be at least 1' })
  @Type(() => Number)
  minGuests?: number;

  @ApiProperty({ 
    description: 'Filter by maximum number of guests',
    example: 10,
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: 'Maximum guests must be a number' })
  @Max(10, { message: 'Maximum guests must not exceed 10' })
  @Type(() => Number)
  maxGuests?: number;

  @ApiProperty({ 
    description: 'Filter by check-in date from (ISO format)',
    example: '2024-01-01',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Check-in date from must be a string' })
  checkInDateFrom?: string;

  @ApiProperty({ 
    description: 'Filter by check-in date to (ISO format)',
    example: '2024-12-31',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Check-in date to must be a string' })
  checkInDateTo?: string;

  @ApiProperty({ 
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of items per page',
    example: 20,
    default: 20,
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ 
    description: 'Sort by field',
    enum: BookingSortBy,
    default: BookingSortBy.CREATED_AT,
    required: false
  })
  @IsOptional()
  @IsEnum(BookingSortBy, { message: 'Sort by must be a valid field' })
  sortBy?: BookingSortBy = BookingSortBy.CREATED_AT;

  @ApiProperty({ 
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    required: false
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Sort order must be ASC or DESC' })
  sortOrder?: SortOrder = SortOrder.DESC;
}