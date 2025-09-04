import { IsString, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceDto {
  @ApiProperty({ 
    description: 'Scheduled date for maintenance',
    example: '2024-01-15T10:00:00Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  scheduleDate?: string;

  @ApiProperty({ 
    description: 'Additional notes about the maintenance',
    example: 'Air conditioning needs repair',
    required: false
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiProperty({ 
    description: 'Type of maintenance required',
    example: 'Electrical',
    required: false
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  maintenanceType?: string;

  @ApiProperty({ 
    description: 'ID of person assigned to handle maintenance',
    example: 'staff-456',
    required: false
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  assignedTo?: string;
}