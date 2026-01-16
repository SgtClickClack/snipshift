import { pgTable, uuid, varchar, text, decimal, timestamp, pgEnum, index, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Shift status enum
 */
export const shiftStatusEnum = pgEnum('shift_status', ['draft', 'pending', 'invited', 'open', 'filled', 'completed', 'confirmed', 'cancelled', 'pending_completion']);

/**
 * Attendance status enum
 */
export const attendanceStatusEnum = pgEnum('attendance_status', ['pending', 'completed', 'no_show']);

/**
 * Payment status enum
 */
export const paymentStatusEnum = pgEnum('payment_status', ['UNPAID', 'AUTHORIZED', 'PAID', 'REFUNDED', 'PAYMENT_FAILED']);

/**
 * Shifts table
 * Stores shift postings created by employers (business users)
 */
export const shifts = pgTable('shifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  role: varchar('role', { length: 64 }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull(),
  // Cancellation logic (hospitality)
  cancellationWindowHours: integer('cancellation_window_hours').notNull().default(24),
  killFeeAmount: decimal('kill_fee_amount', { precision: 10, scale: 2 }),
  staffCancellationReason: text('staff_cancellation_reason'),
  isEmergencyFill: boolean('is_emergency_fill').notNull().default(false),
  uniformRequirements: text('uniform_requirements'),
  rsaRequired: boolean('rsa_required').notNull().default(false),
  expectedPax: integer('expected_pax'),
  status: shiftStatusEnum('status').notNull().default('draft'),
  attendanceStatus: attendanceStatusEnum('attendance_status').default('pending'),
  paymentStatus: paymentStatusEnum('payment_status').default('UNPAID'),
  paymentIntentId: varchar('payment_intent_id', { length: 255 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  applicationFeeAmount: integer('application_fee_amount'), // HospoGo commission in cents
  transferAmount: integer('transfer_amount'), // Amount sent to barber in cents
  location: varchar('location', { length: 512 }),
  lat: decimal('lat', { precision: 10, scale: 7 }), // Latitude for distance filtering
  lng: decimal('lng', { precision: 10, scale: 7 }), // Longitude for distance filtering
  isRecurring: boolean('is_recurring').notNull().default(false),
  autoAccept: boolean('auto_accept').notNull().default(false),
  parentShiftId: uuid('parent_shift_id').references((): any => shifts.id, { onDelete: 'cascade' }),
  clockInTime: timestamp('clock_in_time'), // Timestamp when staff member clocked in
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  employerIdIdx: index('shifts_employer_id_idx').on(table.employerId),
  assigneeIdIdx: index('shifts_assignee_id_idx').on(table.assigneeId),
  statusIdx: index('shifts_status_idx').on(table.status),
  startTimeIdx: index('shifts_start_time_idx').on(table.startTime),
  statusStartTimeIdx: index('shifts_status_start_time_idx').on(table.status, table.startTime),
  parentShiftIdIdx: index('shifts_parent_shift_id_idx').on(table.parentShiftId),
  attendanceStatusIdx: index('shifts_attendance_status_idx').on(table.attendanceStatus),
  paymentStatusIdx: index('shifts_payment_status_idx').on(table.paymentStatus),
  paymentIntentIdIdx: index('shifts_payment_intent_id_idx').on(table.paymentIntentId),
  latLngIdx: index('shifts_lat_lng_idx').on(table.lat, table.lng),
}));

/**
 * Shift offer status enum
 */
export const shiftOfferStatusEnum = pgEnum('shift_offer_status', ['pending', 'accepted', 'declined']);

/**
 * Shift Offers table
 * Tracks specific invites sent to professionals for shifts
 */
export const shiftOffers = pgTable('shift_offers', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: shiftOfferStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  shiftIdIdx: index('shift_offers_shift_id_idx').on(table.shiftId),
  professionalIdIdx: index('shift_offers_professional_id_idx').on(table.professionalId),
  statusIdx: index('shift_offers_status_idx').on(table.status),
  shiftProfessionalIdx: index('shift_offers_shift_professional_idx').on(table.shiftId, table.professionalId),
}));

/**
 * Shift Invitations table
 * Tracks invitations sent to professionals for "First-to-Accept" pattern
 * Multiple professionals can be invited to the same shift
 */
export const shiftInvitations = pgTable('shift_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // 'PENDING', 'EXPIRED', 'DECLINED'
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  shiftIdIdx: index('shift_invitations_shift_id_idx').on(table.shiftId),
  professionalIdIdx: index('shift_invitations_professional_id_idx').on(table.professionalId),
  statusIdx: index('shift_invitations_status_idx').on(table.status),
  shiftProfessionalUnique: index('shift_invitations_shift_professional_unique').on(table.shiftId, table.professionalId),
}));

/**
 * Shift review type enum
 */
export const shiftReviewTypeEnum = pgEnum('shift_review_type', ['SHOP_REVIEWING_BARBER', 'BARBER_REVIEWING_SHOP']);

/**
 * Shift Reviews table
 * Stores reviews/ratings between shops and barbers for completed shifts
 */
export const shiftReviews = pgTable('shift_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  revieweeId: uuid('reviewee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: shiftReviewTypeEnum('type').notNull(),
  rating: decimal('rating', { precision: 1, scale: 0 }).notNull(), // 1-5 integer stored as decimal
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  shiftIdIdx: index('shift_reviews_shift_id_idx').on(table.shiftId),
  reviewerIdIdx: index('shift_reviews_reviewer_id_idx').on(table.reviewerId),
  revieweeIdIdx: index('shift_reviews_reviewee_id_idx').on(table.revieweeId),
  shiftReviewerUnique: index('shift_reviews_shift_reviewer_unique').on(table.shiftId, table.reviewerId, table.type),
}));

/**
 * Shift Logs table
 * Stores detailed attendance logs for clock-in events with geofencing data
 */
export const shiftLogs = pgTable('shift_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'CLOCK_IN', 'CLOCK_OUT', etc.
  latitude: decimal('latitude', { precision: 10, scale: 7 }), // Staff location latitude
  longitude: decimal('longitude', { precision: 10, scale: 7 }), // Staff location longitude
  venueLatitude: decimal('venue_latitude', { precision: 10, scale: 7 }), // Venue location latitude
  venueLongitude: decimal('venue_longitude', { precision: 10, scale: 7 }), // Venue location longitude
  distanceMeters: integer('distance_meters'), // Calculated distance in meters
  accuracy: decimal('accuracy', { precision: 10, scale: 2 }), // GPS accuracy in meters (if provided)
  timestamp: timestamp('timestamp').notNull().defaultNow(), // When the event occurred
  metadata: text('metadata'), // JSON string for additional data (GPS accuracy, device info, etc.)
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  shiftIdIdx: index('shift_logs_shift_id_idx').on(table.shiftId),
  staffIdIdx: index('shift_logs_staff_id_idx').on(table.staffId),
  eventTypeIdx: index('shift_logs_event_type_idx').on(table.eventType),
  timestampIdx: index('shift_logs_timestamp_idx').on(table.timestamp),
  shiftStaffIdx: index('shift_logs_shift_staff_idx').on(table.shiftId, table.staffId),
}));
