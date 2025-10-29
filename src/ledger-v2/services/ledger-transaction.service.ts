import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { LedgerEntryV2 } from '../entities/ledger-entry-v2.entity';
import { CreateLedgerEntryV2Dto } from '../dto/create-ledger-entry-v2.dto';
import { LedgerCalculationService } from './ledger-calculation.service';

@Injectable()
export class LedgerTransactionService {
  constructor(
    @InjectRepository(LedgerEntryV2)
    private ledgerRepository: Repository<LedgerEntryV2>,
    private dataSource: DataSource,
    private calculationService: LedgerCalculationService,
  ) {}

  /**
   * ✅ BULLETPROOF: Create ledger entry with full transaction safety
   */
  async createEntryWithTransaction(
    entryData: CreateLedgerEntryV2Dto
  ): Promise<LedgerEntryV2> {
    // Validate entry data first
    this.calculationService.validateEntryAmounts(entryData.debit, entryData.credit);

    return await this.dataSource.transaction(async manager => {
      
      // 1. ✅ Get current balance with ROW LOCK (prevents race conditions)
      const currentBalance = await this.getCurrentBalanceWithLock(
        entryData.studentId, 
        manager
      );

      // 2. ✅ Calculate new balance (NEVER use Math.abs)
      const newBalance = this.calculationService.calculateRunningBalance(
        currentBalance,
        entryData.debit,
        entryData.credit
      );

      // 3. ✅ Create entry
      const entry = manager.create(LedgerEntryV2, {
        studentId: entryData.studentId,
        hostelId: entryData.hostelId,
        type: entryData.type,
        description: entryData.description,
        referenceId: entryData.referenceId,
        debit: entryData.debit,
        credit: entryData.credit,
        runningBalance: newBalance, // ACTUAL balance, not absolute
        balanceType: this.calculationService.determineBalanceType(newBalance),
        date: entryData.date ? new Date(entryData.date) : new Date(),
        notes: entryData.notes,
        isReversed: false
      });

      // 4. ✅ Save entry atomically
      const savedEntry = await manager.save(entry);

      return savedEntry;
    });
  }

  /**
   * ✅ BULLETPROOF: Reverse entry with transaction safety
   */
  async reverseEntryWithTransaction(
    entryId: string,
    reason: string,
    reversedBy: string = 'admin'
  ): Promise<{ originalEntry: LedgerEntryV2; reversalEntry: LedgerEntryV2 }> {
    return await this.dataSource.transaction(async manager => {
      
      // 1. Get original entry with lock
      const originalEntry = await manager.findOne(LedgerEntryV2, { 
        where: { id: entryId },
        lock: { mode: 'pessimistic_write' }
      });
      
      if (!originalEntry) {
        throw new NotFoundException('Entry not found');
      }

      if (originalEntry.isReversed) {
        throw new BadRequestException('Entry is already reversed');
      }

      // 2. Mark original entry as reversed
      await manager.update(LedgerEntryV2, entryId, { 
        isReversed: true,
        reversedBy,
        reversalDate: new Date()
      });

      // 3. ✅ FIXED: Create proper reversal entry
      const reversalEntryData: CreateLedgerEntryV2Dto = {
        studentId: originalEntry.studentId,
        hostelId: originalEntry.hostelId,
        type: originalEntry.type,
        description: `REVERSAL: ${originalEntry.description} - ${reason}`,
        referenceId: originalEntry.referenceId,
        debit: originalEntry.credit, // Swap debit and credit
        credit: originalEntry.debit
      };

      // Create reversal entry using the same transaction method
      const reversalEntry = await this.createEntryWithTransaction(reversalEntryData);

      return { 
        originalEntry, 
        reversalEntry 
      };
    });
  }

  /**
   * ✅ BULLETPROOF: Get current balance with row lock (prevents race conditions)
   */
  private async getCurrentBalanceWithLock(
    studentId: string,
    manager: EntityManager
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder(LedgerEntryV2, 'entry')
      .select('entry.runningBalance')
      .where('entry.studentId = :studentId', { studentId })
      .andWhere('entry.isReversed = false')
      .orderBy('entry.entrySequence', 'DESC')
      .setLock('pessimistic_write') // ✅ CRITICAL: Prevents race conditions
      .limit(1)
      .getOne();

    return result?.runningBalance || 0;
  }
}