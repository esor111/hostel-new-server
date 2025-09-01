import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDiscountDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  studentId: string;

  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  appliedBy?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  appliedTo?: string;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  isPercentage?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  percentageValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  maxAmount?: number;

  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class ApplyDiscountDto {
  @IsString()
  studentId: string;

  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  appliedBy?: string;

  @IsOptional()
  @IsString()
  discountType?: string;
}