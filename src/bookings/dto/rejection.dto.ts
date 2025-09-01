import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class RejectionDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  reason: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  processedBy?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}