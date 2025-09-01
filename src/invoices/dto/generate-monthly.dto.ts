import { IsString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class GenerateMonthlyDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  month: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  generatedBy?: string;
}