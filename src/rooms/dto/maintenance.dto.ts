import { IsString, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class MaintenanceDto {
  @IsOptional()
  @IsDateString()
  scheduleDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  maintenanceType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  assignedTo?: string;
}