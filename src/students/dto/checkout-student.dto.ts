import { IsOptional, IsDateString, IsNumber, IsBoolean, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckoutStudentDto {
  @IsOptional()
  @IsDateString()
  checkoutDate?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  clearRoom?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  refundAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  deductionAmount?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  processedBy?: string;
}