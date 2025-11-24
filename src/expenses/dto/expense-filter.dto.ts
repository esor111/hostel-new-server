import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ExpenseFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by expense category',
    example: 'Utilities',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter expenses from this date (YYYY-MM-DD)',
    example: '2025-11-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter expenses until this date (YYYY-MM-DD)',
    example: '2025-11-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by month (YYYY-MM format)',
    example: '2025-11',
  })
  @IsOptional()
  @IsString()
  month?: string; // YYYY-MM format
}
