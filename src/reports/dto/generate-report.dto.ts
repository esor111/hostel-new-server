import { IsString, IsOptional, IsDateString, IsEnum, IsObject } from 'class-validator';

export enum ReportType {
  OCCUPANCY = 'occupancy',
  FINANCIAL = 'financial',
  STUDENT = 'student',
  PAYMENT = 'payment',
  BOOKING = 'booking',
  LEDGER = 'ledger',
  MONTHLY = 'monthly'
}

export class GenerateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsObject()
  parameters?: {
    dateFrom?: string;
    dateTo?: string;
    studentId?: string;
    month?: number;
    year?: number;
    generatedBy?: string;
    [key: string]: any;
  };
}

export class GenerateOccupancyReportDto {
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @IsOptional()
  @IsString()
  roomType?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  generatedBy?: string;
}

export class GenerateFinancialReportDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  generatedBy?: string;
}

export class GenerateStudentReportDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  course?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  generatedBy?: string;
}

export class GeneratePaymentReportDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  generatedBy?: string;
}

export class GenerateLedgerReportDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  entryType?: string;

  @IsOptional()
  @IsString()
  generatedBy?: string;
}