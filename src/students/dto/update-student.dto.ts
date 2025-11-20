import { PartialType } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateStudentDto } from './create-student.dto';
import { StudentStatus } from '../entities/student.entity';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  roomNumber?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  guardianName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  guardianRelation?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  baseMonthlyFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  laundryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  foodFee?: number;

  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  course?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  institution?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  idProofType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  idProofNumber?: string;
}