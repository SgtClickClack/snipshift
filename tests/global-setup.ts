import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  // This runs once before all tests
  // The actual sessionStorage restoration happens in each test via context.addInitScript
  // which is set up in the playwright config
}

export default globalSetup;

