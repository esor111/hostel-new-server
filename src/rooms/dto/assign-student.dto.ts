import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class AssignStudentDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  studentId: string;
}