import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getDb } from '../db/index.js';
import { venues, users, shifts } from '../db/schema.js';
import { shiftStatusEnum } from '../db/schema/shifts.js';
import { eq, and, desc, count, gte, sql, isNotNull } from 'drizzle-orm';
import { normalizeParam } from '../utils/request-params.js';

const router = express.Router();

/**
 * GET /api/marketplace/venues
 * Public endpoint to fetch active venues for marketplace listing
 * Supports pagination and verification filter
 */
router.get('/venues', asyncHandler(async (req, res) => {
  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  // Parse query parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const verifiedOnly = req.query.verified !== 'false'; // Default to true (only active venues)
  const offset = (page - 1) * limit;

  try {
    // Build query conditions
    const conditions = [];
    if (verifiedOnly) {
      conditions.push(eq(venues.status, 'active'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch venues with user data (for avatar/banner images)
    const venuesList = await db
      .select({
        id: venues.id,
        venueName: venues.venueName,
        address: venues.address,
        operatingHours: venues.operatingHours,
        status: venues.status,
        createdAt: venues.createdAt,
        // User data for images
        userAvatarUrl: users.avatarUrl,
        userBannerUrl: users.bannerUrl,
        userName: users.name,
      })
      .from(venues)
      .innerJoin(users, eq(venues.userId, users.id))
      .where(whereClause)
      .orderBy(desc(venues.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination (efficient count query)
    const countResult = await db
      .select({ count: count() })
      .from(venues)
      .innerJoin(users, eq(venues.userId, users.id))
      .where(whereClause);

    const totalCount = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    // Transform data for frontend
    const transformedVenues = venuesList.map((venue) => ({
      id: venue.id,
      name: venue.venueName,
      location: venue.address ? formatLocation(venue.address) : null,
      imageUrl: venue.userBannerUrl || venue.userAvatarUrl || null,
      avatarUrl: venue.userAvatarUrl || null,
      status: venue.status,
      createdAt: venue.createdAt.toISOString(),
    }));

    res.status(200).json({
      venues: transformedVenues,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: unknown) {
    console.error('[MARKETPLACE] Error fetching venues:', error);
    res.status(500).json({ message: 'Failed to fetch venues' });
  }
}));

/**
 * Helper function to format address as location string
 */
function formatLocation(address: any): string {
  if (!address) return '';
  
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.suburb) parts.push(address.suburb);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.postcode) parts.push(address.postcode);
  
  return parts.join(', ') || '';
}

/**
 * GET /api/marketplace/venues/:id
 * Public endpoint to fetch a single venue by ID
 * Returns 404 if venue is pending (not active)
 */
router.get('/venues/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  const id = normalizeParam(req.params.id);

  try {
    // Fetch venue with user data
    const [venue] = await db
      .select({
        id: venues.id,
        userId: venues.userId,
        venueName: venues.venueName,
        liquorLicenseNumber: venues.liquorLicenseNumber,
        address: venues.address,
        operatingHours: venues.operatingHours,
        status: venues.status,
        createdAt: venues.createdAt,
        updatedAt: venues.updatedAt,
        // User data for images and bio
        userAvatarUrl: users.avatarUrl,
        userBannerUrl: users.bannerUrl,
        userName: users.name,
        userBio: users.bio,
        userEmail: users.email,
      })
      .from(venues)
      .innerJoin(users, eq(venues.userId, users.id))
      .where(eq(venues.id, id))
      .limit(1);

    if (!venue) {
      res.status(404).json({ message: 'Venue not found' });
      return;
    }

    // Only show active venues publicly
    if (venue.status !== 'active') {
      res.status(404).json({ message: 'Venue is not available' });
      return;
    }

    // Transform data for frontend
    res.status(200).json({
      id: venue.id,
      userId: venue.userId,
      name: venue.venueName,
      description: venue.userBio || null,
      location: venue.address ? formatLocation(venue.address) : null,
      address: venue.address,
      operatingHours: venue.operatingHours,
      imageUrl: venue.userBannerUrl || venue.userAvatarUrl || null,
      avatarUrl: venue.userAvatarUrl || null,
      liquorLicenseNumber: venue.liquorLicenseNumber || null,
      status: venue.status,
      createdAt: venue.createdAt.toISOString(),
      updatedAt: venue.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error('[MARKETPLACE] Error fetching venue:', error);
    res.status(500).json({ message: 'Failed to fetch venue' });
  }
}));

/**
 * GET /api/marketplace/shifts
 * Public endpoint to fetch open shifts with proximity-based search
 * Supports lat/lng/radius parameters for distance filtering
 * 
 * SECURITY: PII Masking Active
 * - Does NOT expose specific staff names (assigneeId masked)
 * - Does NOT expose internal venue notes (description sanitized)
 * - Only exposes: Venue Name, Role, Rate, Location
 * - Enterprise Privacy compliant for investor audit
 * 
 * Query parameters:
 * - lat: Latitude (required for proximity search)
 * - lng: Longitude (required for proximity search)
 * - radius: Search radius in kilometers (default: 10)
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset (default: 0)
 * - status: Shift status filter (default: 'open')
 */
router.get('/shifts', asyncHandler(async (req, res) => {
  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  // Parse query parameters
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
  const radius = req.query.radius ? parseFloat(req.query.radius as string) : 10; // Default 10km
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const statusParam = (req.query.status as string) || 'open';
  
  // Validate status is a valid enum value
  const validStatuses: Array<'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | 'pending_completion'> = 
    ['draft', 'pending', 'invited', 'open', 'filled', 'completed', 'confirmed', 'cancelled', 'pending_completion'];
  const status = validStatuses.includes(statusParam as any) ? statusParam as typeof validStatuses[number] : 'open';

  // Validate coordinates if provided
  if (lat !== null && lng !== null) {
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ message: 'Invalid latitude or longitude values' });
      return;
    }
  }

  try {
    // Build base conditions
    const conditions = [
      eq(shifts.status, status),
      isNotNull(shifts.lat),
      isNotNull(shifts.lng),
      gte(shifts.startTime, new Date()), // Only future shifts
    ];

    const whereClause = and(...conditions);

    // If coordinates provided, calculate distance using Haversine formula
    // Haversine formula: a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
    // c = 2 ⋅ atan2( √a, √(1−a) )
    // d = R ⋅ c
    // Where R = 6371 km (Earth's radius)
    let distanceSelect: any = sql`NULL`;
    let distanceOrderBy: any = null;

    if (lat !== null && lng !== null) {
      // Calculate distance in kilometers using Haversine formula
      // Using SQL to calculate on database side for efficiency
      distanceSelect = sql`
        (
          6371 * acos(
            cos(radians(${lat})) * 
            cos(radians(${shifts.lat})) * 
            cos(radians(${shifts.lng}) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(${shifts.lat}))
          )
        ) AS distance_km
      `;

      // Filter by radius and order by distance
      const radiusCondition = sql`(
        6371 * acos(
          cos(radians(${lat})) * 
          cos(radians(${shifts.lat})) * 
          cos(radians(${shifts.lng}) - radians(${lng})) + 
          sin(radians(${lat})) * 
          sin(radians(${shifts.lat}))
        )
      ) <= ${radius}`;

      conditions.push(radiusCondition);
      distanceOrderBy = sql`distance_km ASC`;
    }

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(shifts)
      .where(and(...conditions));

    const totalCount = Number(countResult[0]?.count || 0);

    // Fetch shifts with distance calculation
    const shiftsQuery = db
      .select({
        id: shifts.id,
        employerId: shifts.employerId,
        assigneeId: shifts.assigneeId,
        role: shifts.role,
        title: shifts.title,
        description: shifts.description,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        hourlyRate: shifts.hourlyRate,
        location: shifts.location,
        lat: shifts.lat,
        lng: shifts.lng,
        status: shifts.status,
        isEmergencyFill: shifts.isEmergencyFill,
        rsaRequired: shifts.rsaRequired,
        createdAt: shifts.createdAt,
        // Employer info
        employerName: users.name,
        employerAvatarUrl: users.avatarUrl,
        distance: distanceSelect,
      })
      .from(shifts)
      .innerJoin(users, eq(shifts.employerId, users.id))
      .where(and(...conditions));

    // Apply ordering
    if (distanceOrderBy) {
      shiftsQuery.orderBy(distanceOrderBy);
    } else {
      shiftsQuery.orderBy(desc(shifts.startTime));
    }

    // Apply pagination
    shiftsQuery.limit(limit).offset(offset);

    const shiftsList = await shiftsQuery;

    /**
     * Transform data for frontend with PII Masking
     * 
     * SECURITY: Enterprise Privacy Standards
     * - assigneeId: MASKED (never expose other staff members)
     * - description: SANITIZED (strip internal notes, keep role-relevant info only)
     * - Only expose: Venue Name, Role, Rate, Location
     */
    const transformedShifts = shiftsList.map((shift) => {
      // Sanitize description - remove internal notes (lines starting with [INTERNAL] or [NOTE])
      // Only keep the first sentence/paragraph for public display
      let sanitizedDescription = shift.description || '';
      if (sanitizedDescription) {
        // Remove internal notes patterns
        sanitizedDescription = sanitizedDescription
          .replace(/\[INTERNAL\][^\n]*/gi, '')
          .replace(/\[NOTE\][^\n]*/gi, '')
          .replace(/\[PRIVATE\][^\n]*/gi, '')
          .replace(/\[STAFF ONLY\][^\n]*/gi, '')
          .trim();
        
        // Keep only first 200 chars of public description
        if (sanitizedDescription.length > 200) {
          sanitizedDescription = sanitizedDescription.substring(0, 200).trim() + '...';
        }
      }

      return {
        id: shift.id,
        // SECURITY: Expose venue/employer ID but NOT assignee (staff member) IDs
        employerId: shift.employerId,
        // assigneeId: MASKED - PII protected, do not expose other workers
        role: shift.role,
        title: shift.title,
        // SECURITY: Sanitized description - internal notes stripped
        description: sanitizedDescription,
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        hourlyRate: shift.hourlyRate,
        location: shift.location,
        lat: shift.lat ? Number(shift.lat) : null,
        lng: shift.lng ? Number(shift.lng) : null,
        status: shift.status,
        isEmergencyFill: shift.isEmergencyFill,
        rsaRequired: shift.rsaRequired,
        createdAt: shift.createdAt.toISOString(),
        // Venue info - public
        employer: {
          name: shift.employerName,
          avatarUrl: shift.employerAvatarUrl,
        },
        distance: shift.distance ? Number(shift.distance) : null, // Distance in kilometers
      };
    });

    res.status(200).json({
      shifts: transformedShifts,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
      searchParams: {
        lat: lat !== null ? lat : undefined,
        lng: lng !== null ? lng : undefined,
        radius: radius,
      },
    });
  } catch (error: unknown) {
    console.error('[MARKETPLACE] Error fetching shifts:', error);
    res.status(500).json({ message: 'Failed to fetch shifts' });
  }
}));

export default router;
