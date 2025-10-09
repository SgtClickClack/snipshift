#!/usr/bin/env node

/**
 * Journey-Based E2E Test Runner
 * 
 * This script helps run the refactored journey-based E2E tests
 * when Cypress is not fully installed or configured.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🟢 SnipShift E2E Journey-Based Test Runner');
console.log('==========================================\n');

// Check if Cypress is installed
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const hasCypress = packageJson.devDependencies && packageJson.devDependencies.cypress;

if (!hasCypress) {
  console.log('⚠️  Cypress is not installed. Installing now...\n');
  
  try {
    execSync('npm install --save-dev cypress --legacy-peer-deps', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    console.log('✅ Cypress installed successfully!\n');
  } catch (error) {
    console.log('❌ Failed to install Cypress. Please install manually:\n');
    console.log('   npm install --save-dev cypress --legacy-peer-deps\n');
    process.exit(1);
  }
}

// Check if Cypress scripts exist in package.json
const hasCypressScripts = packageJson.scripts && (
  packageJson.scripts['cypress:open'] || 
  packageJson.scripts['cypress:run']
);

if (!hasCypressScripts) {
  console.log('⚠️  Adding Cypress scripts to package.json...\n');
  
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts['cypress:open'] = 'cypress open';
  packageJson.scripts['cypress:run'] = 'cypress run';
  packageJson.scripts['cypress:run:smoke'] = 'cypress run --spec "cypress/e2e/smoke-tests.cy.ts"';
  packageJson.scripts['cypress:run:journey'] = 'cypress run --spec "cypress/e2e/00-journey-based-test-runner.cy.ts"';
  packageJson.scripts['cypress:run:auth'] = 'cypress run --spec "cypress/e2e/01-authentication-user-management.cy.ts"';
  packageJson.scripts['cypress:run:shifts'] = 'cypress run --spec "cypress/e2e/02-shift-marketplace.cy.ts"';
  packageJson.scripts['cypress:run:social'] = 'cypress run --spec "cypress/e2e/03-social-features-community.cy.ts"';
  packageJson.scripts['cypress:run:tournaments'] = 'cypress run --spec "cypress/e2e/11-tournament-system.cy.ts"';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Cypress scripts added to package.json!\n');
}

// Display available test commands
console.log('📋 Available Journey-Based Test Commands:');
console.log('==========================================\n');

console.log('🚀 Quick Start:');
console.log('   npm run cypress:open                    # Open Cypress Test Runner');
console.log('   npm run cypress:run:smoke              # Run smoke tests');
console.log('   npm run cypress:run:journey            # Run complete journey tests\n');

console.log('🧪 Individual Test Suites:');
console.log('   npm run cypress:run:auth               # Authentication & User Management');
console.log('   npm run cypress:run:shifts             # Shift Marketplace');
console.log('   npm run cypress:run:social             # Social Features & Community');
console.log('   npm run cypress:run:tournaments        # Tournament System\n');

console.log('🔧 All Tests:');
console.log('   npm run cypress:run                    # Run all Cypress tests\n');

console.log('📖 Documentation:');
console.log('   See E2E_REFACTORING_SUMMARY.md for detailed information\n');

// Check if test files exist
const testFiles = [
  'cypress/e2e/smoke-tests.cy.ts',
  'cypress/e2e/00-journey-based-test-runner.cy.ts',
  'cypress/e2e/01-authentication-user-management.cy.ts',
  'cypress/e2e/02-shift-marketplace.cy.ts',
  'cypress/e2e/03-social-features-community.cy.ts',
  'cypress/e2e/11-tournament-system.cy.ts'
];

console.log('📁 Test Files Status:');
console.log('=====================');

testFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Run: npm run cypress:open');
console.log('2. Select a test file to run');
console.log('3. Or run: npm run cypress:run:smoke');
console.log('4. Check E2E_REFACTORING_SUMMARY.md for detailed documentation\n');

console.log('✨ Journey-based testing is ready to go!');
