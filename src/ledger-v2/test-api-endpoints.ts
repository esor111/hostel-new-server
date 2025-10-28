/**
 * 🔌 LEDGER V2 API ENDPOINT TESTS
 * 
 * This script tests all LedgerV2 API endpoints to ensure they work correctly
 */

interface ApiTestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'error' | 'pending';
  responseTime?: number;
  statusCode?: number;
  error?: string;
  data?: any;
}

class LedgerV2ApiTester {
  private baseUrl: string;
  private testResults: ApiTestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3001/hostel/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * 🧪 Test all LedgerV2 API endpoints
   */
  async runAllTests(): Promise<{
    success: boolean;
    totalTests: number;
    passed: number;
    failed: number;
    results: ApiTestResult[];
  }> {
    console.log('🚀 Starting LedgerV2 API Tests...');
    
    const tests = [
      // Basic endpoints
      { method: 'GET', endpoint: '/ledger-v2', description: 'Get all ledger entries' },
      { method: 'GET', endpoint: '/ledger-v2/stats', description: 'Get ledger statistics' },
      
      // Student-specific endpoints
      { method: 'GET', endpoint: '/ledger-v2/students/test-student-123/entries', description: 'Get student ledger' },
      { method: 'GET', endpoint: '/ledger-v2/students/test-student-123/balance', description: 'Get student balance' },
      { method: 'POST', endpoint: '/ledger-v2/students/test-student-123/reconcile', description: 'Reconcile balance' },
      
      // Entry creation endpoints
      { method: 'POST', endpoint: '/ledger-v2/adjustments', description: 'Create adjustment entry' },
      
      // Admin endpoints
      { method: 'POST', endpoint: '/ledger-v2/entries/test-entry-123/reverse', description: 'Reverse entry' }
    ];

    for (const test of tests) {
      await this.testEndpoint(test.method as any, test.endpoint, test.description);
    }

    const passed = this.testResults.filter(r => r.status === 'success').length;
    const failed = this.testResults.filter(r => r.status === 'error').length;

    console.log(`📊 API Tests Complete: ${passed}/${tests.length} passed`);

    return {
      success: failed === 0,
      totalTests: tests.length,
      passed,
      failed,
      results: this.testResults
    };
  }

  /**
   * 🔍 Test individual endpoint
   */
  private async testEndpoint(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    description: string,
    body?: any
  ): Promise<void> {
    const startTime = Date.now();
    const testResult: ApiTestResult = {
      endpoint,
      method,
      status: 'pending'
    };

    try {
      console.log(`🧪 Testing ${method} ${endpoint}...`);

      const url = `${this.baseUrl}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;

      testResult.responseTime = responseTime;
      testResult.statusCode = response.status;

      if (response.ok) {
        const data = await response.json();
        testResult.status = 'success';
        testResult.data = data;
        console.log(`✅ ${method} ${endpoint} - ${response.status} (${responseTime}ms)`);
      } else {
        const errorText = await response.text();
        testResult.status = 'error';
        testResult.error = `HTTP ${response.status}: ${errorText}`;
        console.log(`❌ ${method} ${endpoint} - ${response.status} (${responseTime}ms)`);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      testResult.responseTime = responseTime;
      testResult.status = 'error';
      testResult.error = error.message;
      console.log(`❌ ${method} ${endpoint} - Error: ${error.message} (${responseTime}ms)`);
    }

    this.testResults.push(testResult);
  }

  /**
   * 📊 Generate test report
   */
  generateReport(): string {
    const passed = this.testResults.filter(r => r.status === 'success').length;
    const failed = this.testResults.filter(r => r.status === 'error').length;
    const avgResponseTime = this.testResults
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + r.responseTime!, 0) / this.testResults.length;

    let report = `
🧪 LEDGER V2 API TEST REPORT
============================

📊 Summary:
- Total Tests: ${this.testResults.length}
- Passed: ${passed}
- Failed: ${failed}
- Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%
- Average Response Time: ${Math.round(avgResponseTime)}ms

📋 Detailed Results:
`;

    this.testResults.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
      const code = result.statusCode ? `[${result.statusCode}]` : '';
      
      report += `${status} ${result.method} ${result.endpoint} ${code} (${time})\n`;
      
      if (result.error) {
        report += `   Error: ${result.error}\n`;
      }
    });

    return report;
  }
}

/**
 * 🎯 MANUAL API TEST SCENARIOS
 */
export const API_TEST_SCENARIOS = [
  {
    name: '📋 Get Ledger Entries',
    method: 'GET',
    endpoint: '/ledger-v2',
    expectedStatus: 200,
    description: 'Should return paginated list of ledger entries'
  },
  {
    name: '📊 Get Statistics',
    method: 'GET',
    endpoint: '/ledger-v2/stats',
    expectedStatus: 200,
    description: 'Should return ledger statistics'
  },
  {
    name: '💰 Get Student Balance',
    method: 'GET',
    endpoint: '/ledger-v2/students/{studentId}/balance',
    expectedStatus: 200,
    description: 'Should return accurate student balance'
  },
  {
    name: '📝 Get Student Entries',
    method: 'GET',
    endpoint: '/ledger-v2/students/{studentId}/entries',
    expectedStatus: 200,
    description: 'Should return student ledger entries'
  },
  {
    name: '⚖️ Create Adjustment',
    method: 'POST',
    endpoint: '/ledger-v2/adjustments',
    expectedStatus: 201,
    description: 'Should create adjustment entry and update balance',
    body: {
      studentId: 'test-student-123',
      amount: 100,
      description: 'Test adjustment',
      type: 'debit'
    }
  },
  {
    name: '🔄 Reverse Entry',
    method: 'POST',
    endpoint: '/ledger-v2/entries/{entryId}/reverse',
    expectedStatus: 200,
    description: 'Should reverse entry and restore balance',
    body: {
      reason: 'Test reversal',
      reversedBy: 'admin'
    }
  },
  {
    name: '🔍 Reconcile Balance',
    method: 'POST',
    endpoint: '/ledger-v2/students/{studentId}/reconcile',
    expectedStatus: 200,
    description: 'Should verify balance accuracy'
  }
];

/**
 * 🚀 Run API tests
 */
export async function runLedgerV2ApiTests(baseUrl?: string) {
  const tester = new LedgerV2ApiTester(baseUrl);
  const results = await tester.runAllTests();
  
  console.log('\n' + tester.generateReport());
  
  return results;
}

/**
 * 🎯 Test specific scenario
 */
export async function testSpecificScenario(scenarioName: string, baseUrl?: string) {
  const scenario = API_TEST_SCENARIOS.find(s => s.name === scenarioName);
  if (!scenario) {
    throw new Error(`Scenario "${scenarioName}" not found`);
  }

  const tester = new LedgerV2ApiTester(baseUrl);
  // Implementation would test the specific scenario
  console.log(`🧪 Testing scenario: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  console.log(`🎯 Expected: ${scenario.expectedStatus} status code`);
}

console.log('🔌 LedgerV2 API Test Suite Ready!');
console.log('📋 Available Scenarios:', API_TEST_SCENARIOS.length);
console.log('🚀 Run with: runLedgerV2ApiTests()');

export { LedgerV2ApiTester };