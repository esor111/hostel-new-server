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
  @ApiProperty({ description: 'Hostel name' })
  name: string;

  @ApiProperty({ description: 'Hostel address' })
  address: string;

  @ApiProperty({ description: 'Hostel contact phone' })
  contactPhone: string;

  @ApiProperty({ description: 'Hostel contact email' })
  contactEmail: string;
}

export class RoomInfoDto {
  @ApiProperty({ description: 'Room ID' })
  id: string;

  @ApiProperty({ description: 'Room name' })
  name: string;

  @ApiProperty({ description: 'Room number' })
  roomNumber: string;

  @ApiProperty({ description: 'Room gender' })
  gender: string;

  @ApiProperty({ description: 'Monthly rate for the room' })
  monthlyRate: number;
}

export class BedInfoDto {
  @ApiProperty({ description: 'Bed ID' })
  id: string;

  @ApiProperty({ description: 'Bed number' })
  bedNumber: string;

  @ApiProperty({ description: 'Bed type' })
  bedType: string;

  @ApiProperty({ description: 'Whether bed is occupied' })
  isOccupied: boolean;
}

export class GuestInfoDto {
  @ApiProperty({ description: 'Guest ID' })
  id: string;

  @ApiProperty({ description: 'Guest name' })
  guestName: string;

  @ApiProperty({ description: 'Guest phone number' })
  phone: string;

  @ApiProperty({ description: 'Guest email' })
  email: string;

  @ApiProperty({ description: 'Guest age' })
  age: number;

  @ApiProperty({ description: 'Guest gender' })
  gender: string;

  @ApiProperty({ description: 'Guest status' })
  status: string;
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
  @ApiProperty({ description: 'Booking ID' })
  id: string;

  @ApiProperty({ description: 'Booking status' })
  status: string;

  @ApiProperty({ description: 'User email for identification' })
  userEmail: string;

  @ApiProperty({ description: 'Hostel information' })
  hostelInfo: HostelInfoDto;

  @ApiProperty({ description: 'Booking details', type: [BookingDetailDto] })
  details: BookingDetailDto[];
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

  @ApiProperty({ description: 'User email for identification' })
  userEmail: string;

  @ApiProperty({ description: 'Pagination information' })
  pagination: PaginationDto;
}

export class CancelMyBookingDto {
  @ApiProperty({ description: 'Reason for cancellation' })
  reason: string;
}