import { IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmBookingDto {
  @ApiProperty({ 
    description: 'ID of the person processing the booking confirmation',
    example: 'admin-user-id',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Processed by must be a string' })
  @Length(1, 100, { message: 'Processed by must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  processedBy?: string;

  @ApiProperty({ 
    description: 'Additional notes for the confirmation',
    example: 'All documents verified',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @Length(0, 500, { message: 'Notes must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;
}