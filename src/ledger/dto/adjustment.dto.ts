import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum AdjustmentType {
  DEBIT = 'debit',
  CREDIT = 'credit'
}

export class AdjustmentDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  studentId: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsString()
  @Transform(({ value }) => value?.trim())
  description: string;

  @IsEnum(AdjustmentType)
  type: AdjustmentType;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  createdBy?: string;
}