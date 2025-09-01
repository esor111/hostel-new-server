import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { CreateAdminChargeDto } from './create-admin-charge.dto';
import { AdminChargeStatus } from '../entities/admin-charge.entity';

export class UpdateAdminChargeDto extends PartialType(CreateAdminChargeDto) {
  @IsOptional()
  @IsEnum(AdminChargeStatus)
  status?: AdminChargeStatus;

  @IsOptional()
  @IsDateString()
  appliedDate?: string;
}