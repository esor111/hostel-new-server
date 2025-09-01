import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateRoomAmenityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateRoomLayoutDto {
  @IsOptional()
  @IsString()
  layoutType?: string;

  @IsOptional()
  bedPositions?: any; // JSONB data

  @IsOptional()
  furnitureLayout?: any; // JSONB data

  @IsOptional()
  dimensions?: any; // JSONB data
}

export class CreateRoomDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  roomNumber: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  capacity: number;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  rent: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => parseInt(value))
  floor?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateRoomLayoutDto)
  layout?: CreateRoomLayoutDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}