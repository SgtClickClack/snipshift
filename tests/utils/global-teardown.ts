import { chromium, FullConfig } from '@playwright/test';

/**
 * Global teardown for error handling tests
 * Cleans up test environment and data
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Error Handling Test Suite Teardown...');
  
  // Launch browser for cleanup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Cleanup test data
    await cleanupTestData(page);
    
    // Generate test report
    await generateTestReport();
    
    // Cleanup environment variables
    await cleanupEnvironment();
    
    console.log('✅ Error Handling Test Suite Teardown Complete');
  } catch (error) {
    console.error('❌ Error Handling Test Suite Teardown Failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await browser.close();
  }
}

async function cleanupTestData(page: any) {
  console.log('🗑️ Cleaning up test data...');
  
  try {
    // Navigate to test data cleanup endpoint
    const response = await page.goto('http://localhost:5000/api/test/cleanup-error-data');
    
    if (response?.ok()) {
      console.log('✅ Test data cleaned up successfully');
    } else {
      console.log('⚠️ Test data cleanup endpoint not available');
    }
  } catch (error) {
    console.log('⚠️ Test data cleanup failed:', error);
  }
}

async function generateTestReport() {
  console.log('📊 Generating test report...');
  
  try {
    // Generate error handling specific report
    const fs = require('fs');
    const path = require('path');
    
    const reportDir = path.join(process.cwd(), 'test-results-error-handling');
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // Create summary report
    const summaryReport = {
      timestamp: new Date().toISOString(),
      testSuite: 'Error Handling & Unhappy Paths',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      errorCategories: {
        networkErrors: 0,
        formValidationErrors: 0,
        authenticationErrors: 0,
        fileUploadErrors: 0,
        sessionErrors: 0,
        paymentErrors: 0,
        databaseErrors: 0,
        accessibilityErrors: 0,
        edgeCases: 0
      },
      recommendations: []
    };
    
    // Write summary report
    fs.writeFileSync(
      path.join(reportDir, 'error-handling-summary.json'),
      JSON.stringify(summaryReport, null, 2)
    );
    
    console.log('✅ Test report generated');
  } catch (error) {
    console.log('⚠️ Test report generation failed:', error);
  }
}

async function cleanupEnvironment() {
  console.log('🔧 Cleaning up environment...');
  
  // Remove error testing environment variables
  delete process.env.ERROR_TESTING_MODE;
  delete process.env.MOCK_ERROR_RESPONSES;
  delete process.env.SLOW_API_RESPONSES;
  delete process.env.TEST_TIMEOUT_MULTIPLIER;
  delete process.env.TEST_USERS;
  
  console.log('✅ Environment cleaned up');
}

export default globalTeardown;
