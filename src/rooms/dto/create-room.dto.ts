import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomAmenityDto {
  @ApiProperty({ 
    description: 'Amenity name',
    example: 'Air Conditioning'
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Description of the amenity',
    example: 'Central air conditioning system',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Whether the amenity is active',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateRoomLayoutDto {
  @ApiProperty({ 
    description: 'Type of room layout',
    example: 'standard',
    required: false
  })
  @IsOptional()
  @IsString()
  layoutType?: string;

  @ApiProperty({ 
    description: 'Bed positions in the room (JSONB data)',
    example: { bed1: { x: 0, y: 0 }, bed2: { x: 100, y: 0 } },
    required: false
  })
  @IsOptional()
  bedPositions?: any; // JSONB data

  @ApiProperty({ 
    description: 'Layout elements from frontend (JSONB data)',
    example: [{ id: 'bed1', type: 'single-bed', x: 0, y: 0, width: 80, height: 40 }],
    required: false
  })
  @IsOptional()
  elements?: any; // CRITICAL FIX: Add elements field for frontend compatibility

  @ApiProperty({ 
    description: 'Furniture layout configuration (JSONB data)',
    example: { desk: { x: 50, y: 50 }, chair: { x: 60, y: 50 } },
    required: false
  })
  @IsOptional()
  furnitureLayout?: any; // JSONB data

  @ApiProperty({ 
    description: 'Room dimensions (JSONB data)',
    example: { width: 400, height: 300, area: 120 },
    required: false
  })
  @IsOptional()
  dimensions?: any; // JSONB data

  @ApiProperty({ 
    description: 'Theme configuration (JSONB data)',
    example: { name: 'Modern', wallColor: '#F8F9FA', floorColor: '#E9ECEF' },
    required: false
  })
  @IsOptional()
  theme?: any; // JSONB data for theme

  @ApiProperty({ 
    description: 'Layout data containing elements and other layout information (JSONB data)',
    example: { elements: [], bedPositions: [] },
    required: false
  })
  @IsOptional()
  layoutData?: any; // JSONB data for layoutData structure

  @ApiProperty({ 
    description: 'Creation timestamp (auto-generated, should be ignored in updates)',
    required: false
  })
  @IsOptional()
  createdAt?: any; // Allow but ignore

  @ApiProperty({ 
    description: 'Warnings array (validation warnings, should be ignored in updates)',
    required: false
  })
  @IsOptional()
  warnings?: any; // Allow but ignore

  // Allow any additional properties that might be sent from frontend
  [key: string]: any;
}

export class CreateRoomDto {
  @ApiProperty({ 
    description: 'Room ID (optional, auto-generated if not provided)',
    example: 'room-123',
    required: false
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ 
    description: 'Room name or title',
    example: 'Deluxe Single Room'
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Room number identifier',
    example: '101'
  })
  @IsString()
  roomNumber: string;

  @ApiProperty({ 
    description: 'Type of room',
    example: 'Single',
    enum: ['Single', 'Double', 'Triple', 'Quad', 'Shared'],
    required: false
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ 
    description: 'Maximum capacity of the room',
    example: 2,
    minimum: 1,
    maximum: 10
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  capacity: number;

  @ApiProperty({ 
    description: 'Monthly rent for the room',
    example: 15000,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  rent: number;

  @ApiProperty({ 
    description: 'Floor number where the room is located',
    example: 1,
    minimum: 1,
    maximum: 20,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => parseInt(value))
  floor?: number;

  @ApiProperty({ 
    description: 'Current status of the room',
    example: 'available',
    enum: ['available', 'occupied', 'maintenance', 'reserved'],
    required: false
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ 
    description: 'Detailed description of the room',
    example: 'Spacious single room with attached bathroom and balcony',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'List of amenities available in the room',
    example: ['AC', 'WiFi', 'Attached Bathroom', 'Balcony'],
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiProperty({ 
    description: 'Room layout configuration',
    type: CreateRoomLayoutDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateRoomLayoutDto)
  layout?: CreateRoomLayoutDto;

  @ApiProperty({ 
    description: 'Whether the room is active/available for booking',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Additional notes about the room',
    example: 'Recently renovated, excellent view',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ 
    description: 'Array of image URLs for the room',
    example: ['https://example.com/room1.jpg', 'https://example.com/room2.jpg'],
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ 
    description: 'Gender preference for the room',
    example: 'Female',
    enum: ['Male', 'Female', 'Mixed', 'Any'],
    required: false
  })
  @IsOptional()
  @IsString()
  gender?: string;
}