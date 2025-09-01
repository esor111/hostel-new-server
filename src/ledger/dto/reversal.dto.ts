import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReversalDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  reversedBy?: string;

  @IsString()
  @Transform(({ value }) => value?.trim())
  reason: string;
}