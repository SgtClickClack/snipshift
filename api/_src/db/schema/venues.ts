/**
 * Venues Schema
 * 
 * Stores venue profile data for Brisbane-based hospitality venues
 */

import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { waitlist } from './waitlist.js';

/**
 * Operating Hours Type
 * JSON structure: { [day: string]: { open: string, close: string, closed?: boolean } }
 * Example: { "monday": { "open": "09:00", "close": "17:00" }, "sunday": { "closed": true } }
 */

/**
 * Address Type
 * Structured address object matching ISO 3166-1 and Australian postcode standards
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

/**
 * Operating Hours Type
 * JSON structure per day of week
 */
export interface OperatingHours {
  [day: string]: {
    open?: string; // HH:mm format (e.g., "09:00")
    close?: string; // HH:mm format (e.g., "17:00")
    closed?: boolean; // true if venue is closed on this day
  };
}

/**
 * Venues table
 * Stores venue profile data linked to users and optionally waitlist entries
 */
export const venues = pgTable('venues', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  waitlistId: uuid('waitlist_id').references(() => waitlist.id, { onDelete: 'set null' }), // Optional link to waitlist entry
  
  // Venue Information
  venueName: varchar('venue_name', { length: 255 }).notNull(),
  liquorLicenseNumber: varchar('liquor_license_number', { length: 100 }), // Optional
  
  // Structured Address (JSONB for flexibility)
  address: jsonb('address').notNull().$type<VenueAddress>(),
  
  // Operating Hours (JSONB per day)
  operatingHours: jsonb('operating_hours').notNull().$type<OperatingHours>(),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('venues_user_id_idx').on(table.userId),
  waitlistIdIdx: index('venues_waitlist_id_idx').on(table.waitlistId),
  venueNameIdx: index('venues_venue_name_idx').on(table.venueName),
}));
