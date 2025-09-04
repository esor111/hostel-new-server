import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VacateStudentDto {
  @ApiProperty({ 
    description: 'ID of the student to vacate from the room',
    example: 'student-123'
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  studentId: string;
}