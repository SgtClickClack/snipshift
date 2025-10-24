#!/usr/bin/env node

/**
 * Cleanup Script for Snipshift Codebase
 * Removes duplicate, unused, and temporary files/directories
 */

import fs from 'fs';
import path from 'path';

const directoriesToRemove = [
  '_client_DEACTIVATED',     // 672 unused .tsx files
  'temp-server',             // Duplicate server implementation
  'snipshift-next-restored', // Abandoned GraphQL migration (1495 files)
  'snipshift-production-deploy', // Build artifacts checked into Git
  'src',                     // Duplicate frontend (48 files)
  'react-app',               // Unused React app
  'coverage',                // Test coverage artifacts
  'playwright-report',       // Test report artifacts
  'test-results',            // Test result artifacts
  'node_modules',            // Will be regenerated
];

const filesToRemove = [
  // Build artifacts
  'snipshift-production-build.zip',
  'server-error.log',
  'server-output.log',
  'cypress-results.txt',
  'cypress-test-results.txt',
  'test-results.json',
  
  // Temporary scripts
  'build-for-deployment.js',
  'build-frontend.js',
  'comprehensive-test-server.js',
  'copy-build.js',
  'deploy.bat',
  'deploy.js',
  'deploy.sh',
  'dev-server-frontend.js',
  'final-test-execution.js',
  'production-server.js',
  'run-dev.sh',
  'run-journey-tests.js',
  'run-test.bat',
  'run.js',
  'simple-dev-server.js',
  'simple-server.js',
  'simple-test-server.js',
  'test-dependencies.sh',
  'test-server.js',
  'start-cypress.bat',
  'start-server.bat',
  
  // Git automation files
  'git-automation-setup.ps1',
  'git-automation.bat',
  'git-automation.config',
  'git-automation.ps1',
  
  // Build scripts
  'create-production-build-fixed.sh',
  'create-production-build.bat',
  'create-production-build.sh',
];

const documentationToKeep = [
  'README.md',
  'CONTRIBUTING.md',
  'DEPLOYMENT.md',
  'TESTING_STRATEGY.md',
  'roadmap.md',
  'env.template',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'jest.config.js',
  'cypress.config.ts',
  'playwright.config.ts',
];

function removeDirectory(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    console.log(`🗑️  Removing directory: ${dirPath}`);
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

function removeFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    console.log(`🗑️  Removing file: ${filePath}`);
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

function cleanupCodebase() {
  console.log('🧹 Starting Snipshift codebase cleanup...\n');
  
  let removedDirs = 0;
  let removedFiles = 0;
  
  // Remove directories
  console.log('📁 Removing duplicate directories:');
  for (const dir of directoriesToRemove) {
    if (removeDirectory(dir)) {
      removedDirs++;
    }
  }
  
  console.log('\n📄 Removing temporary files:');
  // Remove files
  for (const file of filesToRemove) {
    if (removeFile(file)) {
      removedFiles++;
    }
  }
  
  // Clean up documentation files (keep only essential ones)
  console.log('\n📚 Cleaning up documentation files:');
  const allFiles = fs.readdirSync('.');
  const markdownFiles = allFiles.filter(file => file.endsWith('.md'));
  
  for (const mdFile of markdownFiles) {
    if (!documentationToKeep.includes(mdFile)) {
      if (removeFile(mdFile)) {
        removedFiles++;
      }
    }
  }
  
  console.log('\n✅ Cleanup completed!');
  console.log('📊 Summary:');
  console.log(`   - Directories removed: ${removedDirs}`);
  console.log(`   - Files removed: ${removedFiles}`);
  console.log(`   - Total items cleaned: ${removedDirs + removedFiles}`);
  
  // Calculate space saved (rough estimate)
  const estimatedSpaceSaved = (removedDirs * 50) + (removedFiles * 0.1); // MB
  console.log(`   - Estimated space saved: ~${estimatedSpaceSaved.toFixed(1)}MB`);
  
  console.log('\n🎯 Next steps:');
  console.log('   1. Run `npm install` to regenerate node_modules');
  console.log('   2. Run `npm run db:migrate` to set up database');
  console.log('   3. Run `npm run dev` to start development server');
  console.log('   4. Run `npm run test` to verify everything works');
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupCodebase();
}

export { cleanupCodebase };
