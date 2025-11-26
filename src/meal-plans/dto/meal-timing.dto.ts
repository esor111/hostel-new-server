import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export class CreateMealTimingDto {
  @ApiPropertyOptional({ example: '07:00', description: 'Breakfast start time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'breakfastStart must be in HH:mm format' })
  breakfastStart?: string;

  @ApiPropertyOptional({ example: '09:00', description: 'Breakfast end time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'breakfastEnd must be in HH:mm format' })
  breakfastEnd?: string;

  @ApiPropertyOptional({ example: '12:00', description: 'Lunch start time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'lunchStart must be in HH:mm format' })
  lunchStart?: string;

  @ApiPropertyOptional({ example: '14:00', description: 'Lunch end time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'lunchEnd must be in HH:mm format' })
  lunchEnd?: string;

  @ApiPropertyOptional({ example: '16:00', description: 'Snacks start time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'snacksStart must be in HH:mm format' })
  snacksStart?: string;

  @ApiPropertyOptional({ example: '17:00', description: 'Snacks end time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'snacksEnd must be in HH:mm format' })
  snacksEnd?: string;

  @ApiPropertyOptional({ example: '19:00', description: 'Dinner start time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'dinnerStart must be in HH:mm format' })
  dinnerStart?: string;

  @ApiPropertyOptional({ example: '21:00', description: 'Dinner end time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'dinnerEnd must be in HH:mm format' })
  dinnerEnd?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether meal timing is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMealTimingDto extends CreateMealTimingDto {}
