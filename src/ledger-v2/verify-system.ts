/**
 * 🔍 LEDGER V2 SYSTEM VERIFICATION
 * 
 * Quick verification script to ensure the system is working correctly
 */

import { LedgerCalculationService } from './services/ledger-calculation.service';
import { BalanceType } from '../ledger/entities/ledger-entry.entity';

/**
 * 🧮 Verify balance calculations
 */
function verifyBalanceCalculations(): boolean {
  console.log('🧮 Testing Balance Calculations...');
  
  const calc = new LedgerCalculationService();
  
  try {
    // Test 1: Positive balance (student owes money)
    const positiveBalance = calc.calculateRunningBalance(0, 1000, 500);
    if (positiveBalance !== 500) {
      console.log('❌ Positive balance calculation failed');
      return false;
    }
    if (calc.determineBalanceType(positiveBalance) !== BalanceType.DR) {
      console.log('❌ Positive balance type determination failed');
      return false;
    }
    
    // Test 2: Negative balance (student has credit) - CRITICAL TEST
    const negativeBalance = calc.calculateRunningBalance(0, 500, 1000);
    if (negativeBalance !== -500) {
      console.log('❌ Negative balance calculation failed');
      return false;
    }
    if (calc.determineBalanceType(negativeBalance) !== BalanceType.CR) {
      console.log('❌ Negative balance type determination failed');
      return false;
    }
    
    // Test 3: Zero balance
    const zeroBalance = calc.calculateRunningBalance(0, 1000, 1000);
    if (zeroBalance !== 0) {
      console.log('❌ Zero balance calculation failed');
      return false;
    }
    if (calc.determineBalanceType(zeroBalance) !== BalanceType.NIL) {
      console.log('❌ Zero balance type determination failed');
      return false;
    }
    
    // Test 4: Complex balance calculation
    let runningBalance = 0;
    runningBalance = calc.calculateRunningBalance(runningBalance, 1500, 0); // +1500 (invoice)
    runningBalance = calc.calculateRunningBalance(runningBalance, 0, 1000); // -1000 (payment)
    runningBalance = calc.calculateRunningBalance(runningBalance, 200, 0);  // +200 (admin charge)
    runningBalance = calc.calculateRunningBalance(runningBalance, 0, 100);  // -100 (discount)
    
    if (runningBalance !== 600) {
      console.log(`❌ Complex balance calculation failed: expected 600, got ${runningBalance}`);
      return false;
    }
    
    console.log('✅ Balance calculations: ALL PASSED');
    return true;
    
  } catch (error) {
    console.log(`❌ Balance calculation error: ${error.message}`);
    return false;
  }
}

/**
 * ⚖️ Verify validation logic
 */
function verifyValidation(): boolean {
  console.log('⚖️ Testing Validation Logic...');
  
  const calc = new LedgerCalculationService();
  
  try {
    // Test valid entries
    calc.validateEntryAmounts(100, 0); // Valid debit
    calc.validateEntryAmounts(0, 100); // Valid credit
    
    // Test invalid entries
    let errorCount = 0;
    
    try {
      calc.validateEntryAmounts(-100, 0); // Negative debit
    } catch {
      errorCount++;
    }
    
    try {
      calc.validateEntryAmounts(0, -100); // Negative credit
    } catch {
      errorCount++;
    }
    
    try {
      calc.validateEntryAmounts(100, 100); // Both debit and credit
    } catch {
      errorCount++;
    }
    
    try {
      calc.validateEntryAmounts(0, 0); // Neither debit nor credit
    } catch {
      errorCount++;
    }
    
    if (errorCount !== 4) {
      console.log(`❌ Validation failed: expected 4 errors, got ${errorCount}`);
      return false;
    }
    
    console.log('✅ Validation logic: ALL PASSED');
    return true;
    
  } catch (error) {
    console.log(`❌ Validation error: ${error.message}`);
    return false;
  }
}

/**
 * 🔄 Verify reversal logic (CRITICAL TEST)
 */
function verifyReversalLogic(): boolean {
  console.log('🔄 Testing Reversal Logic (CRITICAL)...');
  
  const calc = new LedgerCalculationService();
  
  try {
    // Simulate original entry: debit 500 (student owes 500)
    let balance = calc.calculateRunningBalance(0, 500, 0);
    if (balance !== 500) {
      console.log('❌ Original entry balance incorrect');
      return false;
    }
    
    // Simulate reversal: credit 500 (reverse the debit)
    balance = calc.calculateRunningBalance(balance, 0, 500);
    if (balance !== 0) {
      console.log(`❌ Reversal balance incorrect: expected 0, got ${balance}`);
      return false;
    }
    
    // Test negative balance reversal
    balance = calc.calculateRunningBalance(0, 0, 1000); // Student has 1000 credit
    if (balance !== -1000) {
      console.log('❌ Negative balance setup failed');
      return false;
    }
    
    // Reverse the credit with a debit
    balance = calc.calculateRunningBalance(balance, 1000, 0);
    if (balance !== 0) {
      console.log(`❌ Negative balance reversal failed: expected 0, got ${balance}`);
      return false;
    }
    
    console.log('✅ Reversal logic: ALL PASSED (NO Math.abs issues!)');
    return true;
    
  } catch (error) {
    console.log(`❌ Reversal logic error: ${error.message}`);
    return false;
  }
}

/**
 * 🎯 Verify transaction ID generation
 */
function verifyTransactionIds(): boolean {
  console.log('🎯 Testing Transaction ID Generation...');
  
  const calc = new LedgerCalculationService();
  
  try {
    const id1 = calc.generateTransactionId();
    const id2 = calc.generateTransactionId();
    const id3 = calc.generateTransactionId('CUSTOM');
    
    // Check format
    if (!id1.startsWith('TXN-')) {
      console.log('❌ Default transaction ID format incorrect');
      return false;
    }
    
    if (!id3.startsWith('CUSTOM-')) {
      console.log('❌ Custom transaction ID format incorrect');
      return false;
    }
    
    // Check uniqueness
    if (id1 === id2) {
      console.log('❌ Transaction IDs are not unique');
      return false;
    }
    
    console.log('✅ Transaction ID generation: ALL PASSED');
    return true;
    
  } catch (error) {
    console.log(`❌ Transaction ID error: ${error.message}`);
    return false;
  }
}

/**
 * 📊 Run comprehensive verification
 */
export function runSystemVerification(): {
  success: boolean;
  results: {
    balanceCalculations: boolean;
    validation: boolean;
    reversalLogic: boolean;
    transactionIds: boolean;
  };
  summary: string;
} {
  console.log('🔍 STARTING LEDGER V2 SYSTEM VERIFICATION');
  console.log('=' .repeat(50));
  
  const results = {
    balanceCalculations: verifyBalanceCalculations(),
    validation: verifyValidation(),
    reversalLogic: verifyReversalLogic(),
    transactionIds: verifyTransactionIds()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  const passedCount = Object.values(results).filter(result => result === true).length;
  const totalCount = Object.keys(results).length;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION RESULTS');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('\n' + '='.repeat(50));
  
  let summary: string;
  
  if (allPassed) {
    summary = `🎉 ALL TESTS PASSED (${passedCount}/${totalCount})! SYSTEM IS READY FOR PRODUCTION!`;
    console.log(summary);
    console.log('🚀 Key Features Verified:');
    console.log('   ✅ Accurate balance calculations (no Math.abs issues)');
    console.log('   ✅ Proper validation prevents invalid entries');
    console.log('   ✅ Reversal logic works correctly (CRITICAL FIX)');
    console.log('   ✅ Transaction IDs generate uniquely');
  } else {
    summary = `❌ SOME TESTS FAILED (${passedCount}/${totalCount}). PLEASE FIX ISSUES BEFORE DEPLOYMENT.`;
    console.log(summary);
    console.log('🔧 Failed Tests Need Attention:');
    Object.entries(results).forEach(([test, passed]) => {
      if (!passed) {
        console.log(`   ❌ ${test}`);
      }
    });
  }
  
  console.log('='.repeat(50));
  
  return {
    success: allPassed,
    results,
    summary
  };
}

/**
 * 🎯 Quick health check
 */
export function quickHealthCheck(): boolean {
  console.log('⚡ Quick LedgerV2 Health Check...');
  
  try {
    const calc = new LedgerCalculationService();
    
    // Critical test: ensure no Math.abs in balance calculations
    const negativeBalance = calc.calculateRunningBalance(0, 100, 200);
    if (negativeBalance !== -100) {
      console.log('❌ Critical: Balance calculation incorrect');
      return false;
    }
    
    // Critical test: ensure balance type is correct for negative balance
    if (calc.determineBalanceType(negativeBalance) !== BalanceType.CR) {
      console.log('❌ Critical: Balance type determination incorrect');
      return false;
    }
    
    console.log('✅ Health check passed - Core functionality working');
    return true;
    
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

// Auto-run verification if this file is executed directly
if (require.main === module) {
  runSystemVerification();
}

console.log('🔍 LedgerV2 System Verification Ready!');
console.log('🚀 Run with: runSystemVerification()');
console.log('⚡ Quick check: quickHealthCheck()');

export default {
  runSystemVerification,
  quickHealthCheck,
  verifyBalanceCalculations,
  verifyValidation,
  verifyReversalLogic,
  verifyTransactionIds
};