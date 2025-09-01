import { IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AdditionalChargeDto {
  @IsOptional()
  id?: string;

  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  amount: number;
}

export class ConfigureStudentDto {
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  baseMonthlyFee: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  laundryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  foodFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  wifiFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  maintenanceFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  securityDeposit?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalChargeDto)
  additionalCharges?: AdditionalChargeDto[];
}