/**
 * Encryption utilities for sensitive data (e.g. OAuth tokens)
 * Uses AES-256-GCM. Key must be 32-byte hex string (XERO_ENCRYPTION_KEY).
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const keyHex = process.env.XERO_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error('XERO_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt plaintext. Returns base64-encoded string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt ciphertext produced by encrypt()
 */
export function decrypt(encryptedBase64: string): string {
  const key = getKey();
  const buf = Buffer.from(encryptedBase64, 'base64');
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data');
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}
