import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum LedgerEntryType {
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  DISCOUNT = 'discount',
  ADJUSTMENT = 'adjustment',
  REFUND = 'refund'
}

export enum BalanceType {
  DR = 'DR',
  CR = 'CR',
  NIL = 'NIL'
}

export class CreateLedgerEntryDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  studentId: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsEnum(LedgerEntryType)
  type: LedgerEntryType;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  debit: number;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  credit: number;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  balance: number;

  @IsEnum(BalanceType)
  balanceType: BalanceType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class CreateAdjustmentDto {
  @IsString()
  studentId: string;

  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsString()
  description: string;

  @IsEnum(['debit', 'credit'])
  type: 'debit' | 'credit';

  @IsOptional()
  @IsString()
  createdBy?: string;
}