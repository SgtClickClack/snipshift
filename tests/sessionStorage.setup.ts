import { test as base, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load sessionStorage from storageState.json
function loadSessionStorage(): Array<{ name: string; value: string }> {
  try {
    const storageStatePath = path.join(__dirname, 'storageState.json');
    if (fs.existsSync(storageStatePath)) {
      const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
      return (storageState.sessionStorage || []) as Array<{ name: string; value: string }>;
    }
  } catch (error) {
    console.warn('Failed to load sessionStorage from storageState.json:', error);
  }
  return [];
}

const sessionStorageData = loadSessionStorage();

// Helper function to restore sessionStorage in a context
export async function restoreSessionStorage(context: BrowserContext) {
  if (sessionStorageData.length > 0) {
    await context.addInitScript((sessionStorageItems) => {
      // Restore sessionStorage items
      if (sessionStorageItems && Array.isArray(sessionStorageItems)) {
        sessionStorageItems.forEach((item: { name: string; value: string }) => {
          try {
            sessionStorage.setItem(item.name, item.value);
          } catch (e) {
            console.warn(`Failed to set sessionStorage item ${item.name}:`, e);
          }
        });
      }
    }, sessionStorageData);
  }
}

// Extend the base test to restore sessionStorage automatically
export const test = base.extend({
  context: async ({ context }, use) => {
    // Restore sessionStorage before using the context
    await restoreSessionStorage(context);
    await use(context);
  },
});

export { expect } from '@playwright/test';

