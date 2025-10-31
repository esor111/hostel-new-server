import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CheckInDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  hostelId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
