import { Injectable, BadRequestException } from '@nestjs/common';
import { BalanceType } from '../../ledger/entities/ledger-entry.entity';

@Injectable()
export class LedgerCalculationService {
  
  /**
   * ✅ BULLETPROOF: Calculate running balance (can be negative)
   */
  calculateRunningBalance(
    previousBalance: number,
    debit: number,
    credit: number
  ): number {
    const prevBal = parseFloat(previousBalance.toString()) || 0;
    const debitAmt = parseFloat(debit.toString()) || 0;
    const creditAmt = parseFloat(credit.toString()) || 0;
    
    // Calculate new balance: Previous + Debits - Credits
    const newBalance = prevBal + debitAmt - creditAmt;
    
    // Round to 2 decimal places to avoid floating point issues
    return Math.round(newBalance * 100) / 100;
  }

  /**
   * ✅ BULLETPROOF: Determine balance type from actual balance
   */
  determineBalanceType(balance: number): BalanceType {
    const bal = parseFloat(balance.toString()) || 0;
    
    if (bal > 0.01) return BalanceType.DR;  // Student owes money
    if (bal < -0.01) return BalanceType.CR; // Student has credit/overpaid
    return BalanceType.NIL; // Balanced (within 1 cent)
  }

  /**
   * ✅ BULLETPROOF: Validate entry amounts
   */
  validateEntryAmounts(debit: number, credit: number): void {
    const debitAmt = parseFloat(debit.toString()) || 0;
    const creditAmt = parseFloat(credit.toString()) || 0;

    // Amounts cannot be negative
    if (debitAmt < 0 || creditAmt < 0) {
      throw new BadRequestException('Amounts cannot be negative');
    }

    // Cannot have both debit and credit in same entry
    if (debitAmt > 0 && creditAmt > 0) {
      throw new BadRequestException('Entry cannot have both debit and credit amounts');
    }

    // Must have either debit or credit
    if (debitAmt === 0 && creditAmt === 0) {
      throw new BadRequestException('Entry must have either debit or credit amount');
    }
  }

  /**
   * ✅ BULLETPROOF: Generate unique transaction ID
   */
  generateTransactionId(prefix: string = 'TXN'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  }
}