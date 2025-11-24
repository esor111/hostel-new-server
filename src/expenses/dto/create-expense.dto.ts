import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Title of the expense',
    example: 'Electricity Bill',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the expense',
    example: 'Monthly electricity charges for November 2025',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Amount of the expense',
    example: 5000,
    type: Number,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({
    description: 'Category of the expense',
    example: 'Utilities',
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Date when the expense occurred (YYYY-MM-DD)',
    example: '2025-11-20',
  })
  @IsDateString()
  expenseDate: string;
}
