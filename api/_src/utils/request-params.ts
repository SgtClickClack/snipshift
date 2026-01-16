/**
 * Utility functions for normalizing Express request parameters and query values
 * to handle TypeScript's strict typing for req.params and req.query
 */

import { ParsedQs } from 'qs';

/**
 * Normalizes a request parameter value to a string
 * Handles both string and string[] types from req.params
 */
export function normalizeParam(value: string | string[] | undefined): string {
  if (value === undefined) {
    throw new Error('Parameter is required but was undefined');
  }
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Normalizes a request parameter value to a string or undefined
 * Handles both string and string[] types from req.params
 */
export function normalizeParamOptional(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Normalizes a query parameter value to a string
 * Handles string, string[], and ParsedQs types from req.query
 */
export function normalizeQuery(value: string | string[] | ParsedQs | undefined): string {
  if (value === undefined) {
    throw new Error('Query parameter is required but was undefined');
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'string') {
    return value;
  }
  // ParsedQs case - convert to string
  return String(value);
}

/**
 * Normalizes a query parameter value to a string or undefined
 * Handles string, string[], and ParsedQs types from req.query
 */
export function normalizeQueryOptional(value: string | string[] | ParsedQs | (string | ParsedQs)[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : String(first);
  }
  if (typeof value === 'string') {
    return value;
  }
  // ParsedQs case - convert to string
  return String(value);
}
