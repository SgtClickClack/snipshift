import { describe, it, expect } from 'vitest';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

/**
 * Auth Guard Smoke Test
 * 
 * This test verifies that Firebase Admin SDK can be initialized correctly
 * with the required environment variables. It should fail the build if:
 * - FIREBASE_PRIVATE_KEY is missing or null
 * - FIREBASE_PROJECT_ID is missing or null
 * - The credentials are malformed
 * 
 * This test is intentionally NOT mocked - it performs a real initialization
 * check to catch configuration issues before deployment.
 */
describe('Auth Guard: Firebase Admin SDK Initialization', () => {
  it('should have FIREBASE_PROJECT_ID environment variable set', () => {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    expect(projectId).toBeDefined();
    expect(projectId).not.toBe('');
    expect(projectId).not.toBeNull();
  });

  it('should have FIREBASE_PRIVATE_KEY environment variable set', () => {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    expect(privateKey).toBeDefined();
    expect(privateKey).not.toBe('');
    expect(privateKey).not.toBeNull();
    
    // Verify the key has the expected format (starts with BEGIN PRIVATE KEY)
    if (privateKey) {
      const normalizedKey = privateKey.replace(/\\n/g, '\n');
      expect(normalizedKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(normalizedKey).toContain('-----END PRIVATE KEY-----');
    }
  });

  it('should have FIREBASE_CLIENT_EMAIL environment variable set', () => {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    expect(clientEmail).toBeDefined();
    expect(clientEmail).not.toBe('');
    expect(clientEmail).not.toBeNull();
    
    // Verify it looks like an email
    if (clientEmail) {
      expect(clientEmail).toContain('@');
      expect(clientEmail).toContain('.');
    }
  });

  it('should successfully initialize Firebase Admin SDK with individual env vars', () => {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // Verify all required variables are present
    expect(projectId).toBeDefined();
    expect(clientEmail).toBeDefined();
    expect(privateKey).toBeDefined();

    // Try to initialize Firebase Admin SDK
    const appName = 'auth-check-test-app';
    
    // Clean up any existing app with this name
    try {
      admin.app(appName).delete();
    } catch (e) {
      // App doesn't exist, which is fine
    }

    let app: admin.app.App;
    try {
      app = admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId: projectId!,
            clientEmail: clientEmail!,
            privateKey: privateKey!,
          }),
          projectId: projectId!,
        },
        appName
      );

      // Verify the app was initialized
      expect(app).toBeDefined();
      expect(app.name).toBe(appName);

      // Verify we can get the auth instance
      const auth = admin.auth(app);
      expect(auth).toBeDefined();

      // Clean up
      app.delete();
    } catch (error: any) {
      // Clean up on error
      try {
        admin.app(appName).delete();
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw new Error(
        `Firebase Admin SDK initialization failed: ${error?.message || error}. ` +
        `This indicates a problem with the environment variables. ` +
        `Check that FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID, and FIREBASE_CLIENT_EMAIL are correctly set.`
      );
    }
  });

  it('should verify privateKey and projectId are not null after initialization', () => {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // These checks are redundant but explicit for clarity
    expect(projectId).not.toBeNull();
    expect(projectId).not.toBeUndefined();
    expect(privateKey).not.toBeNull();
    expect(privateKey).not.toBeUndefined();

    // Additional validation: projectId should be a non-empty string
    expect(typeof projectId).toBe('string');
    expect(projectId!.length).toBeGreaterThan(0);

    // Additional validation: privateKey should be a non-empty string
    expect(typeof privateKey).toBe('string');
    expect(privateKey!.length).toBeGreaterThan(0);
  });
});
