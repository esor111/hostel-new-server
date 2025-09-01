import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateStudentDto } from './update-student.dto';

export class BulkUpdateStudentDto {
  @IsArray()
  @IsNotEmpty()
  studentIds: string[];

  @ValidateNested()
  @Type(() => UpdateStudentDto)
  updates: UpdateStudentDto;
}