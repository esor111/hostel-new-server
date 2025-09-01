import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsDateString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { AdminChargeType } from '../entities/admin-charge.entity';

export class CreateAdminChargeDto {
  @IsString()
  studentId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsOptional()
  @IsEnum(AdminChargeType)
  chargeType?: AdminChargeType;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  recurringMonths?: number;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsString()
  createdBy: string;
}