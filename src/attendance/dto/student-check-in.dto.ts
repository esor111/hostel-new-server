import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentCheckInDto {
  @ApiProperty({
    description: 'Optional notes for check-in',
    example: 'Going to library',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
