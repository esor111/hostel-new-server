import { ApiProperty } from '@nestjs/swagger';

export class AvailableBedDto {
  @ApiProperty({ description: 'Bed UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'Bed identifier (e.g., A1, B2)', example: 'A1' })
  bedIdentifier: string;

  @ApiProperty({ description: 'Room ID', example: 'room-123' })
  roomId: string;

  @ApiProperty({ description: 'Room number', example: '101' })
  roomNumber: string;

  @ApiProperty({ description: 'Room name', example: 'Room 101' })
  roomName: string;

  @ApiProperty({ description: 'Bed type (informational)', example: 'standard' })
  bedType: string;

  @ApiProperty({ description: 'Gender restriction', example: 'Male', enum: ['Male', 'Female', 'Any'] })
  gender: string;

  @ApiProperty({ description: 'Floor number (informational)', example: 1 })
  floor: number;

  @ApiProperty({ description: 'Hostel ID', example: 'hostel-123' })
  hostelId: string;

  @ApiProperty({ description: 'Hostel name', example: 'Main Hostel' })
  hostelName: string;
}

export class HostelInfoDto {
  @ApiProperty({ description: 'Hostel ID', example: 'hostel-123' })
  id: string;

  @ApiProperty({ description: 'Hostel name', example: 'Main Hostel' })
  name: string;

  @ApiProperty({ description: 'Business ID', example: 'business-456' })
  businessId: string;

  @ApiProperty({ description: 'Total available beds', example: 25 })
  availableBeds: number;
}

export class BookingRequirementsResponseDto {
  @ApiProperty({ description: 'List of available beds with full details', type: [AvailableBedDto] })
  availableBeds: AvailableBedDto[];

  @ApiProperty({ description: 'List of hostels', type: [HostelInfoDto] })
  hostels: HostelInfoDto[];

  @ApiProperty({ description: 'Total available beds count', example: 25 })
  totalAvailableBeds: number;

  @ApiProperty({ description: 'Beds grouped by gender', example: { Male: 10, Female: 12, Any: 3 } })
  bedsByGender: {
    Male: number;
    Female: number;
    Any: number;
  };

  @ApiProperty({ description: 'Beds grouped by hostel', example: { 'hostel-123': 15, 'hostel-456': 10 } })
  bedsByHostel: Record<string, number>;
}
