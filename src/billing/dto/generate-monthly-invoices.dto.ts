import { IsNumber, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class GenerateMonthlyInvoicesDto {
  @ApiProperty({ 
    description: 'Month for which to generate invoices (1-12)',
    example: 1,
    minimum: 1,
    maximum: 12
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  month: number;

  @ApiProperty({ 
    description: 'Year for which to generate invoices',
    example: 2024
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  year: number;

  @ApiProperty({ 
    description: 'Due date for the generated invoices',
    example: '2024-01-31T23:59:59Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}