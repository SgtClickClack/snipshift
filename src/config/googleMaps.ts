/**
 * Google Maps Configuration Placeholder
 * 
 * This file demonstrates how to use the Google Maps API key from environment variables
 * Replace this with actual Google Maps initialization when implementing location features
 */

import { env, isGoogleMapsConfigured } from './env';

/**
 * Get Google Maps API key from environment
 * 
 * Usage:
 * ```typescript
 * import { getGoogleMapsApiKey } from '@/config/googleMaps';
 * 
 * const apiKey = getGoogleMapsApiKey();
 * // Use with @googlemaps/js-api-loader or similar
 * ```
 */
export const getGoogleMapsApiKey = (): string => {
  if (!isGoogleMapsConfigured()) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY is not configured. Please set it in your environment variables.');
  }
  return env.google.mapsApiKey!;
};

