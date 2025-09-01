import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class ApprovalDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  processedBy?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  assignedRoom?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  createStudent?: boolean = false;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}