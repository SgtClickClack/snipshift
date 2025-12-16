import { Loader } from '@googlemaps/js-api-loader';
import { logger } from '@/lib/logger';

let googleMapsPromise: Promise<any> | null = null;

export const loadGoogleMaps = async (retries = 3): Promise<any> => {
  // Re-read env var each time to handle potential hydration race conditions
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  
  // Simple retry logic for early boot/Service Worker context
  if (!apiKey && retries > 0) {
    await new Promise(r => setTimeout(r, 100));
    return loadGoogleMaps(retries - 1);
  }

  if (!apiKey) {
    logger.error('GoogleMaps', 'Google Maps API key missing. Map features will be disabled.');
    return Promise.reject('Google Maps API key is missing');
  }

  if (!googleMapsPromise) {
    const loader = new Loader({
      apiKey: apiKey,
      version: 'beta',
      libraries: ['places', 'geometry', 'marker']
    });

    googleMapsPromise = loader.load();
  }

  return googleMapsPromise;
};

export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const google = await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          logger.warn('GoogleMaps', 'Geocoding failed:', status);
          resolve(null);
        }
      });
    });
  } catch (error) {
    logger.error('GoogleMaps', 'Failed to load Google Maps:', error);
    return null;
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const google = await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          logger.warn('GoogleMaps', 'Reverse geocoding failed:', status);
          resolve(null);
        }
      });
    });
  } catch (error) {
    logger.error('GoogleMaps', 'Failed to load Google Maps:', error);
    return null;
  }
};

/**
 * Reverse geocode coordinates to extract just the city name
 * @param lat Latitude
 * @param lng Longitude
 * @returns City name or null if not found
 */
export const reverseGeocodeToCity = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const google = await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results && results.length > 0) {
          // Search through all results to find the city (locality)
          for (const result of results) {
            for (const component of result.address_components || []) {
              // Look for locality (city) first
              if (component.types.includes('locality')) {
                resolve(component.long_name);
                return;
              }
            }
          }
          
          // Fallback: try to find sublocality or administrative_area_level_2
          for (const result of results) {
            for (const component of result.address_components || []) {
              if (component.types.includes('sublocality') || 
                  component.types.includes('administrative_area_level_2')) {
                resolve(component.long_name);
                return;
              }
            }
          }
          
          // Last fallback: use the first result's formatted address (shortened)
          const firstResult = results[0].formatted_address;
          // Take just the first part before the comma
          const shortAddress = firstResult.split(',')[0];
          resolve(shortAddress);
        } else {
          logger.warn('GoogleMaps', 'Reverse geocoding to city failed:', status);
          resolve(null);
        }
      });
    });
  } catch (error) {
    logger.error('GoogleMaps', 'Failed to load Google Maps for city lookup:', error);
    return null;
  }
};

export const calculateDistance = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number => {
  // Haversine formula for distance calculation
  const R = 6371; // Earth's radius in km
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};