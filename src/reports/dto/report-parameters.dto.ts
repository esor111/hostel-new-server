import { IsOptional, IsDateString, IsString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReportParametersDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  studentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  roomId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  status?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  generatedBy?: string;
}