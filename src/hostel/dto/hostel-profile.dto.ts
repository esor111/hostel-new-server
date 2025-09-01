import { IsString, IsEmail, IsArray, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHostelProfileDto {
  @ApiProperty()
  @IsString()
  hostelName: string;

  @ApiProperty()
  @IsString()
  ownerName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  province: string;

  @ApiProperty()
  @IsString()
  district: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsArray()
  amenities: Array<{
    id: string;
    label: string;
    checked: boolean;
  }>;

  @ApiProperty()
  @IsObject()
  policies: {
    checkInTime: string;
    checkOutTime: string;
    cancelationPolicy: string;
    smokingPolicy: string;
    petPolicy: string;
    visitorPolicy: string;
  };

  @ApiProperty()
  @IsObject()
  pricing: {
    dormBed: number;
    privateRoom: number;
    laundryService: number;
    foodService: number;
  };
}

export class UpdateHostelProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hostelName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  amenities?: Array<{
    id: string;
    label: string;
    checked: boolean;
  }>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  policies?: {
    checkInTime: string;
    checkOutTime: string;
    cancelationPolicy: string;
    smokingPolicy: string;
    petPolicy: string;
    visitorPolicy: string;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  pricing?: {
    dormBed: number;
    privateRoom: number;
    laundryService: number;
    foodService: number;
  };
}