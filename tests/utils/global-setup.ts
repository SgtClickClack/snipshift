import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for error handling tests
 * Prepares test environment and data
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Error Handling Test Suite Setup...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Setup test environment
    await setupTestEnvironment(page);
    
    // Create test data
    await createTestData(page);
    
    // Verify server is running
    await verifyServerHealth(page);
    
    console.log('✅ Error Handling Test Suite Setup Complete');
  } catch (error) {
    console.error('❌ Error Handling Test Suite Setup Failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestEnvironment(page: any) {
  console.log('📋 Setting up test environment...');
  
  // Set environment variables for error testing
  process.env.ERROR_TESTING_MODE = '1';
  process.env.MOCK_ERROR_RESPONSES = '1';
  process.env.SLOW_API_RESPONSES = '1';
  process.env.TEST_TIMEOUT_MULTIPLIER = '2';
  
  // Configure test data
  process.env.TEST_USERS = JSON.stringify({
    professional: {
      email: 'professional@test.com',
      password: 'test123',
      roles: ['professional']
    },
    hub: {
      email: 'hub@test.com',
      password: 'test123',
      roles: ['hub']
    },
    brand: {
      email: 'brand@test.com',
      password: 'test123',
      roles: ['brand']
    },
    trainer: {
      email: 'trainer@test.com',
      password: 'test123',
      roles: ['trainer']
    }
  });
  
  console.log('✅ Test environment configured');
}

async function createTestData(page: any) {
  console.log('📊 Creating test data...');
  
  // Navigate to test data creation endpoint
  try {
    const response = await page.goto('http://localhost:5000/api/test/setup-error-data');
    
    if (response?.ok()) {
      console.log('✅ Test data created successfully');
    } else {
      console.log('⚠️ Test data creation endpoint not available, using mocks');
    }
  } catch (error) {
    console.log('⚠️ Test data creation failed, using mocks:', error);
  }
}

async function verifyServerHealth(page: any) {
  console.log('🔍 Verifying server health...');
  
  try {
    const response = await page.goto('http://localhost:5000/health');
    
    if (response?.ok()) {
      console.log('✅ Server is healthy');
    } else {
      throw new Error(`Server health check failed: ${response?.status()}`);
    }
  } catch (error) {
    console.error('❌ Server health check failed:', error);
    throw error;
  }
}

export default globalSetup;
