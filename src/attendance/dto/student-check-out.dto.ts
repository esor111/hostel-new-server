import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentCheckOutDto {
  @ApiProperty({
    description: 'Hostel UUID',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  hostelId: string;

  @ApiProperty({
    description: 'Optional notes for check-out',
    example: 'Returning from library',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
