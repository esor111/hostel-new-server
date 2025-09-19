import { IsOptional, IsDateString, IsNumber, IsBoolean, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutStudentDto {
  @ApiPropertyOptional({
    description: 'Checkout date (ISO format)',
    example: '2024-03-15'
  })
  @IsOptional()
  @IsDateString()
  checkoutDate?: string;

  @ApiPropertyOptional({
    description: 'Whether to clear the room assignment',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  clearRoom?: boolean;

  @ApiPropertyOptional({
    description: 'Amount to refund to the student',
    example: 2000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  refundAmount?: number;

  @ApiPropertyOptional({
    description: 'Amount to deduct from student account',
    example: 500,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  deductionAmount?: number;

  @ApiPropertyOptional({
    description: 'Additional notes about the checkout',
    example: 'Room condition good, no damages'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional({
    description: 'ID of the person processing the checkout',
    example: 'admin-123'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  processedBy?: string;
}