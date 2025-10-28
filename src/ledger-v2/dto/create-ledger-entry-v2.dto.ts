import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LedgerEntryType } from '../../ledger/entities/ledger-entry.entity';

export class CreateLedgerEntryV2Dto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Hostel ID' })
  @IsString()
  @IsUUID()
  hostelId: string;

  @ApiProperty({ enum: LedgerEntryType, description: 'Type of ledger entry' })
  @IsEnum(LedgerEntryType)
  type: LedgerEntryType;

  @ApiProperty({ description: 'Entry description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Reference ID (invoice, payment, etc.)' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiProperty({ description: 'Debit amount', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debit: number;

  @ApiProperty({ description: 'Credit amount', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit: number;

  @ApiPropertyOptional({ description: 'Entry date' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Created by user' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class CreateAdjustmentV2Dto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Adjustment amount', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Adjustment description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: ['debit', 'credit'], description: 'Adjustment type' })
  @IsEnum(['debit', 'credit'])
  type: 'debit' | 'credit';

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Created by user' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class ReverseEntryV2Dto {
  @ApiPropertyOptional({ description: 'User who initiated the reversal' })
  @IsOptional()
  @IsString()
  reversedBy?: string;

  @ApiProperty({ description: 'Reason for reversal' })
  @IsString()
  reason: string;
}

export class LedgerFiltersV2Dto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by student ID' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ enum: LedgerEntryType, description: 'Filter by entry type' })
  @IsOptional()
  @IsEnum(LedgerEntryType)
  type?: LedgerEntryType;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Search in description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Include reversed entries' })
  @IsOptional()
  includeReversed?: boolean;
}