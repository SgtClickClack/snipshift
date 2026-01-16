/**
 * Geofencing Utilities
 * 
 * Provides distance calculation using the Haversine formula
 * for validating staff location when clocking in to shifts.
 */

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * 
 * @param lat1 - Latitude of first point (in degrees)
 * @param lon1 - Longitude of first point (in degrees)
 * @param lat2 - Latitude of second point (in degrees)
 * @param lon2 - Longitude of second point (in degrees)
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
}

/**
 * Validate if a location is within the allowed radius of a venue
 * 
 * @param userLat - User's latitude
 * @param userLon - User's longitude
 * @param venueLat - Venue's latitude
 * @param venueLon - Venue's longitude
 * @param maxRadiusMeters - Maximum allowed radius in meters (default: 200)
 * @returns Object with isValid flag and distance in meters
 */
export function validateLocationProximity(
  userLat: number,
  userLon: number,
  venueLat: number,
  venueLon: number,
  maxRadiusMeters: number = 200
): { isValid: boolean; distance: number } {
  const distance = calculateDistance(userLat, userLon, venueLat, venueLon);
  return {
    isValid: distance <= maxRadiusMeters,
    distance: Math.round(distance)
  };
}
