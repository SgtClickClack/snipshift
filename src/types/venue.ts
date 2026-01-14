/**
 * Venue Types
 * 
 * Type definitions for venue-related data structures
 */

export interface VenueAddress {
  street: string;
  suburb: string;
  postcode: string; // Brisbane postcodes: 4000-4199
  city: string; // Should be "Brisbane" for Brisbane venues
  state: string; // Should be "QLD" for Queensland
  country: string; // ISO 3166-1 alpha-2 code: "AU"
  lat?: number; // Optional latitude for geocoding
  lng?: number; // Optional longitude for geocoding
}

export interface OperatingHours {
  [day: string]: {
    open?: string; // HH:mm format (e.g., "09:00")
    close?: string; // HH:mm format (e.g., "17:00")
    closed?: boolean; // true if venue is closed on this day
  };
}

export interface VenueProfile {
  id: string;
  userId: string;
  waitlistId?: string | null;
  venueName: string;
  liquorLicenseNumber?: string | null;
  address: VenueAddress;
  operatingHours: OperatingHours;
  createdAt: Date;
  updatedAt: Date;
}
