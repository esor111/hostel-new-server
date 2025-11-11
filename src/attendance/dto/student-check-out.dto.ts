import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentCheckOutDto {
  @ApiProperty({
    description: 'Optional notes for check-out',
    example: 'Returning from library',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
