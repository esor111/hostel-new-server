import { IsString, IsEmail, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateManualStudentDto {
  @ApiProperty({
    description: 'Full name of the student',
    example: 'John Doe'
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Phone number of the student (used to generate userId)',
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
    description: 'Home address of the student',
    example: '123 Main St, Kathmandu, Nepal'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  address?: string;

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
    example: 'Citizenship'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  idProofType?: string;

  @ApiPropertyOptional({
    description: 'ID proof document number',
    example: '12-34-56-78901'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  idProofNumber?: string;

  @ApiProperty({
    description: 'Selected bed ID for assignment',
    example: 'bed-uuid-123'
  })
  @IsUUID()
  bedId: string;

  @ApiPropertyOptional({
    description: 'Check-in date (ISO format)',
    example: '2024-01-15'
  })
  @IsOptional()
  @IsDateString()
  checkInDate?: string;
}

export class BedSelectionResponseDto {
  @ApiProperty({ description: 'Bed unique identifier' })
  bedId: string;

  @ApiProperty({ description: 'Bed number within room' })
  bedNumber: string;

  @ApiProperty({ description: 'Unique bed identifier (room-bed)' })
  bedIdentifier: string;

  @ApiProperty({ description: 'Current bed status' })
  status: string;

  @ApiProperty({ description: 'Monthly rate for this bed' })
  monthlyRate: number;

  @ApiProperty({ description: 'Bed description' })
  description?: string;

  @ApiProperty({ description: 'Room information' })
  room: {
    roomId: string;
    roomNumber: string;
    floor: number;
  };
}

export class FloorSelectionResponseDto {
  @ApiProperty({ description: 'Floor number' })
  floorNumber: number;

  @ApiProperty({ description: 'Total rooms on this floor' })
  totalRooms: number;

  @ApiProperty({ description: 'Rooms with available beds' })
  availableRooms: number;

  @ApiProperty({ description: 'Total beds on this floor' })
  totalBeds: number;

  @ApiProperty({ description: 'Available beds on this floor' })
  availableBeds: number;
}

export class RoomSelectionResponseDto {
  @ApiProperty({ description: 'Room unique identifier' })
  roomId: string;

  @ApiProperty({ description: 'Room number' })
  roomNumber: string;

  @ApiProperty({ description: 'Room name' })
  name: string;

  @ApiProperty({ description: 'Floor number' })
  floor: number;

  @ApiProperty({ description: 'Total bed count' })
  bedCount: number;

  @ApiProperty({ description: 'Current occupancy' })
  occupancy: number;

  @ApiProperty({ description: 'Available beds' })
  availableBeds: number;

  @ApiProperty({ description: 'Monthly rate' })
  monthlyRate: number;

  @ApiProperty({ description: 'Room status' })
  status: string;

  @ApiProperty({ description: 'Gender preference' })
  gender?: string;
}
