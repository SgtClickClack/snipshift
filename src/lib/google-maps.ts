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
    return Promise.reject(new Error('Google Maps API key is missing'));
  }

  if (!googleMapsPromise) {
    const loader = new Loader({
      apiKey: apiKey,
      version: 'beta',
      libraries: ['places', 'geometry', 'marker']
    });

    googleMapsPromise = loader.load().catch((error) => {
      // Handle Referer blocking and other authorization errors
      const errorMessage = error?.message || String(error);
      const isRefererBlocked = 
        errorMessage.includes('RefererNotAllowedMapError') ||
        errorMessage.includes('Referer') ||
        errorMessage.includes('This API key is not authorized') ||
        errorMessage.includes('Referer restriction') ||
        errorMessage.toLowerCase().includes('referer');
      
      if (isRefererBlocked) {
        logger.error('GoogleMaps', 'Google Maps API Referer blocked. Map features will be disabled.');
        return Promise.reject(new Error('MAP_REFERER_BLOCKED'));
      }
      
      // Reset promise on error so we can retry
      googleMapsPromise = null;
      logger.error('GoogleMaps', 'Failed to load Google Maps:', error);
      return Promise.reject(error);
    });
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
 * Reverse geocode coordinates to extract the city/region name
 * Prioritizes broader geographic areas over suburbs for better UX
 * @param lat Latitude
 * @param lng Longitude
 * @returns City/region name or null if not found
 */
export const reverseGeocodeToCity = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const google = await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results && results.length > 0) {
          // In Australia, suburbs are often returned as "locality" but we want the broader city
          // Priority: administrative_area_level_2 (LGA/city) > colloquial_area > locality > sublocality
          
          let locality: string | null = null;
          let adminLevel2: string | null = null;
          let colloquialArea: string | null = null;
          let sublocality: string | null = null;
          
          // Search through all results to find the best match
          for (const result of results) {
            for (const component of result.address_components || []) {
              // administrative_area_level_2 is typically the LGA/city in Australia
              if (component.types.includes('administrative_area_level_2') && !adminLevel2) {
                adminLevel2 = component.long_name;
              }
              // Colloquial area can be broader city names like "Gold Coast"
              if (component.types.includes('colloquial_area') && !colloquialArea) {
                colloquialArea = component.long_name;
              }
              // locality is often a suburb in Australia
              if (component.types.includes('locality') && !locality) {
                locality = component.long_name;
              }
              if (component.types.includes('sublocality') && !sublocality) {
                sublocality = component.long_name;
              }
            }
          }
          
          // For Australian cities, prefer the broader area name
          // Check if locality looks like a suburb (common patterns: Beach, Park, Hills, Heights, etc.)
          const suburbPatterns = /\b(Beach|Park|Hills|Heights|Point|Bay|Waters|Grove|Glen|Vale|Creek|West|East|North|South|Central|City|CBD)\b/i;
          const looksLikeSuburb = locality && suburbPatterns.test(locality);
          
          // Priority order for best user experience:
          // 1. colloquial_area (e.g., "Gold Coast", "Sunshine Coast")
          // 2. administrative_area_level_2 if locality looks like a suburb
          // 3. locality (if it's a real city name, not a suburb)
          // 4. administrative_area_level_2 as fallback
          // 5. sublocality as last resort
          
          if (colloquialArea) {
            resolve(colloquialArea);
            return;
          }
          
          if (looksLikeSuburb && adminLevel2) {
            resolve(adminLevel2);
            return;
          }
          
          if (locality) {
            resolve(locality);
            return;
          }
          
          if (adminLevel2) {
            resolve(adminLevel2);
            return;
          }
          
          if (sublocality) {
            resolve(sublocality);
            return;
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