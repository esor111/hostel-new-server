import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { MultiGuestBookingStatus } from '../entities/multi-guest-booking.entity';

export class GetMyBookingsDto {
  @ApiProperty({ 
    description: 'Page number for pagination', 
    required: false, 
    default: 1, 
    minimum: 1 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of bookings per page', 
    required: false, 
    default: 20, 
    minimum: 1, 
    maximum: 100 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ 
    description: 'Filter by booking status', 
    required: false,
    enum: MultiGuestBookingStatus
  })
  @IsOptional()
  @IsEnum(MultiGuestBookingStatus)
  status?: MultiGuestBookingStatus;
}

export class HostelInfoDto {
  @ApiProperty({ description: 'Hostel ID' })
  hostelId: string;

  @ApiProperty({ description: 'Hostel name' })
  hostelName: string;

  @ApiProperty({ description: 'Hostel location' })
  location: string;
}

export class RoomInfoDto {
  @ApiProperty({ description: 'Room ID' })
  roomId: string;

  @ApiProperty({ description: 'Room type (e.g., Double Sharing, Triple Sharing)' })
  roomType: string;

  @ApiProperty({ description: 'Room floor number' })
  roomFloor: number;

  @ApiProperty({ description: 'Room capacity (number of beds)' })
  capacity: number;
}

export class BedInfoDto {
  @ApiProperty({ description: 'Bed ID' })
  bedId: string;

  @ApiProperty({ description: 'Bed status (approved, pending, rejected)' })
  status: string;
}

export class GuestInfoDto {
  @ApiProperty({ description: 'Student ID' })
  studentId: string;

  @ApiProperty({ description: 'Student name' })
  studentName: string;

  @ApiProperty({ description: 'Applied date (YYYY-MM-DD format)' })
  appliedDate: string;
}

export class BookingDetailDto {
  @ApiProperty({ description: 'Room information' })
  roomInfo: RoomInfoDto;

  @ApiProperty({ description: 'Bed information' })
  bedInfo: BedInfoDto;

  @ApiProperty({ description: 'Guest information' })
  guestInfo: GuestInfoDto;
}

export class MyBookingDto {
  @ApiProperty({ description: 'Booking ID (actual UUID)' })
  id: string;

  @ApiProperty({ description: 'Booking status' })
  status: string;

  @ApiProperty({ description: 'Hostel information' })
  hostelInfo: HostelInfoDto;

  @ApiProperty({ description: 'Booking details', type: [BookingDetailDto] })
  details: BookingDetailDto[];

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: string;
}

export class PaginationDto {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class MyBookingsResponseDto {
  @ApiProperty({ description: 'List of user bookings', type: [MyBookingDto] })
  data: MyBookingDto[];

  @ApiProperty({ description: 'Pagination information' })
  pagination: PaginationDto;
}

export class CancelMyBookingDto {
  @ApiProperty({ description: 'Reason for cancellation' })
  reason: string;
}