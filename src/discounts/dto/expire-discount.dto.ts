import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExpireDiscountDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  expiredBy?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  reason?: string;
}