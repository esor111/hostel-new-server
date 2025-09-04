import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ExpireDiscountDto {
  @ApiProperty({ 
    description: 'ID of the person who expired the discount',
    example: 'admin-123',
    required: false
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  expiredBy?: string;

  @ApiProperty({ 
    description: 'Reason for expiring the discount',
    example: 'No longer applicable',
    required: false
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  reason?: string;
}