import { IsString, IsOptional, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelBookingDto {
  @ApiProperty({ 
    description: 'Reason for cancelling the booking',
    example: 'Guest requested cancellation due to changed plans'
  })
  @IsString({ message: 'Cancellation reason is required' })
  @Length(5, 500, { message: 'Cancellation reason must be between 5 and 500 characters' })
  @Transform(({ value }) => value?.trim())
  reason: string;

  @ApiPropertyOptional({ 
    description: 'ID of the person processing the cancellation',
    example: 'admin-user-id'
  })
  @IsOptional()
  @IsString({ message: 'Processed by must be a string' })
  @Length(1, 100, { message: 'Processed by must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  processedBy?: string;

  @ApiPropertyOptional({ 
    description: 'Additional notes for the cancellation',
    example: 'Refund processed to original payment method'
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @Length(0, 500, { message: 'Notes must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;
}