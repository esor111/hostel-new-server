import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateStudentDto } from './update-student.dto';

export class BulkUpdateStudentDto {
  @ApiProperty({
    description: 'Array of student IDs to update',
    example: ['student-123', 'student-456'],
    type: [String]
  })
  @IsArray()
  @IsNotEmpty()
  studentIds: string[];

  @ApiProperty({
    description: 'Updates to apply to all selected students',
    type: UpdateStudentDto
  })
  @ValidateNested()
  @Type(() => UpdateStudentDto)
  updates: UpdateStudentDto;
}