import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LedgerEntryType, BalanceType } from '../../ledger/entities/ledger-entry.entity';

export class LedgerEntryResponseV2Dto {
  @ApiProperty({ description: 'Entry ID' })
  id: string;

  @ApiProperty({ description: 'Student ID' })
  studentId: string;

  @ApiProperty({ description: 'Student name' })
  studentName: string;

  @ApiProperty({ description: 'Hostel ID' })
  hostelId: string;

  @ApiProperty({ description: 'Entry date' })
  date: Date;

  @ApiProperty({ enum: LedgerEntryType, description: 'Entry type' })
  type: LedgerEntryType;

  @ApiProperty({ description: 'Entry description' })
  description: string;

  @ApiPropertyOptional({ description: 'Reference ID' })
  referenceId?: string;

  @ApiProperty({ description: 'Debit amount' })
  debit: number;

  @ApiProperty({ description: 'Credit amount' })
  credit: number;

  @ApiProperty({ description: 'Running balance after this entry' })
  runningBalance: number;

  @ApiProperty({ description: 'Absolute balance (for display)' })
  absoluteBalance: number;

  @ApiProperty({ enum: BalanceType, description: 'Balance type' })
  balanceType: BalanceType;

  @ApiProperty({ description: 'Entry sequence number' })
  entrySequence: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  notes?: string;

  @ApiProperty({ description: 'Is entry reversed' })
  isReversed: boolean;

  @ApiProperty({ description: 'Entry creation date' })
  createdAt: Date;
}

export class StudentBalanceResponseV2Dto {
  @ApiProperty({ description: 'Student ID' })
  studentId: string;

  @ApiProperty({ description: 'Current balance (can be negative)' })
  currentBalance: number;

  @ApiProperty({ description: 'Total debit amount' })
  debitBalance: number;

  @ApiProperty({ description: 'Total credit amount' })
  creditBalance: number;

  @ApiProperty({ enum: BalanceType, description: 'Balance type' })
  balanceType: BalanceType;

  @ApiProperty({ description: 'Total number of entries' })
  totalEntries: number;
}

export class PaginatedLedgerResponseV2Dto {
  @ApiProperty({ type: [LedgerEntryResponseV2Dto], description: 'Ledger entries' })
  items: LedgerEntryResponseV2Dto[];

  @ApiProperty({ description: 'Pagination information' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class LedgerStatsResponseV2Dto {
  @ApiProperty({ description: 'Total number of entries' })
  totalEntries: number;

  @ApiProperty({ description: 'Total debit amount' })
  totalDebits: number;

  @ApiProperty({ description: 'Total credit amount' })
  totalCredits: number;

  @ApiProperty({ description: 'Net balance across all students' })
  netBalance: number;

  @ApiProperty({ description: 'Number of active students' })
  activeStudents: number;
}

export class ReconciliationResultV2Dto {
  @ApiProperty({ description: 'Student ID' })
  studentId: string;

  @ApiProperty({ description: 'Reconciliation status' })
  status: 'BALANCED' | 'DISCREPANCY_FOUND' | 'ERROR';

  @ApiProperty({ description: 'Calculated balance from entries' })
  calculatedBalance: number;

  @ApiProperty({ description: 'Stored balance in snapshot' })
  storedBalance: number;

  @ApiProperty({ description: 'Discrepancy amount (if any)' })
  discrepancy: number;

  @ApiProperty({ description: 'Requires correction' })
  requiresCorrection: boolean;

  @ApiProperty({ description: 'Total entries processed' })
  totalEntries: number;

  @ApiProperty({ description: 'Reconciliation timestamp' })
  reconciledAt: Date;

  @ApiPropertyOptional({ description: 'Error message (if any)' })
  errorMessage?: string;
}

export class ReversalResultV2Dto {
  @ApiProperty({ type: LedgerEntryResponseV2Dto, description: 'Original entry' })
  originalEntry: LedgerEntryResponseV2Dto;

  @ApiProperty({ type: LedgerEntryResponseV2Dto, description: 'Reversal entry' })
  reversalEntry: LedgerEntryResponseV2Dto;

  @ApiProperty({ description: 'Reversal timestamp' })
  reversedAt: Date;

  @ApiProperty({ description: 'Reversal reason' })
  reason: string;
}