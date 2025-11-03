import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SwitchBedDto {
  @ApiProperty({
    description: 'UUID of the target bed to switch to',
    example: 'bed-uuid-123'
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  newBedId: string;

  @ApiPropertyOptional({
    description: 'Effective date of the switch (ISO format)',
    example: '2025-11-03',
    default: 'Current date if not provided'
  })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: 'Reason for bed switch',
    example: 'Student request due to noise issues'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  reason?: string;

  @ApiPropertyOptional({
    description: 'ID of admin/user approving the switch',
    example: 'admin-123'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  approvedBy?: string;
}
