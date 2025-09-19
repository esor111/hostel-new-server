import { IsEnum, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../entities/meal-plan.entity';

export class CreateMealPlanDto {
  @ApiProperty({ 
    enum: DayOfWeek,
    description: 'Day of the week for the meal plan',
    example: DayOfWeek.SUNDAY
  })
  @IsEnum(DayOfWeek)
  day: DayOfWeek;

  @ApiProperty({ 
    description: 'Breakfast menu for the day',
    example: 'Tea Biscuit',
    maxLength: 255
  })
  @IsString()
  @MaxLength(255)
  breakfast: string;

  @ApiProperty({ 
    description: 'Lunch menu for the day',
    example: 'Dal, Rice, Vegetable, Achar',
    maxLength: 255
  })
  @IsString()
  @MaxLength(255)
  lunch: string;

  @ApiProperty({ 
    description: 'Snacks menu for the day',
    example: 'Chana Bhuja',
    maxLength: 255
  })
  @IsString()
  @MaxLength(255)
  snacks: string;

  @ApiProperty({ 
    description: 'Dinner menu for the day',
    example: 'Dal, Rice, Vegetable, Achar',
    maxLength: 255
  })
  @IsString()
  @MaxLength(255)
  dinner: string;

  @ApiPropertyOptional({ 
    description: 'Additional notes for the meal plan',
    example: 'Special dietary requirements noted'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Whether the meal plan is active',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}