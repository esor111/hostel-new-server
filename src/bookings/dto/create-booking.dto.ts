import { IsString, IsNumber, IsOptional, IsDateString, IsEmail, IsPhoneNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  preferredRoom?: string;

  @IsOptional()
  @IsString()
  course?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  @Transform(({ value }) => parseInt(value))
  duration?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  idProofType?: string;

  @IsOptional()
  @IsString()
  idProofNumber?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class ApproveBookingDto {
  @IsOptional()
  @IsString()
  processedBy?: string;

  @IsOptional()
  @IsString()
  assignedRoom?: string;

  @IsOptional()
  @IsString()
  createStudent?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectBookingDto {
  @IsOptional()
  @IsString()
  processedBy?: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}