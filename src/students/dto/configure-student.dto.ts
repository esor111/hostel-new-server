import { IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdditionalChargeDto {
  @ApiPropertyOptional({
    description: 'Charge ID (optional)',
    example: 'charge-123'
  })
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({
    description: 'Description of the additional charge',
    example: 'Gym membership fee'
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Amount of the additional charge',
    example: 1000,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  amount: number;
}

export class ConfigureStudentDto {
  @ApiProperty({
    description: 'Base monthly accommodation fee',
    example: 15000,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  baseMonthlyFee: number;

  @ApiPropertyOptional({
    description: 'Monthly laundry fee',
    example: 500,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  laundryFee?: number;

  @ApiPropertyOptional({
    description: 'Monthly food fee',
    example: 8000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  foodFee?: number;

  @ApiPropertyOptional({
    description: 'Monthly WiFi fee',
    example: 300,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  wifiFee?: number;

  @ApiPropertyOptional({
    description: 'Monthly maintenance fee',
    example: 200,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value) || 0)
  maintenanceFee?: number;

  @ApiPropertyOptional({
    description: 'Additional charges and fees',
    type: [AdditionalChargeDto],
    example: [
      {
        id: 'charge-1',
        description: 'Gym membership',
        amount: 1000
      }
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalChargeDto)
  additionalCharges?: AdditionalChargeDto[];
}