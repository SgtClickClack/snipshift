import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getDb } from '../db/index.js';
import { venues, users } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

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

    // Get total count for pagination
    const countQuery = db
      .select()
      .from(venues)
      .innerJoin(users, eq(venues.userId, users.id))
      .where(whereClause);

    const allMatchingVenues = await countQuery;
    const totalCount = allMatchingVenues.length;
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
  } catch (error: any) {
    console.error('[MARKETPLACE] Error fetching venues:', error);
    res.status(500).json({ message: 'Failed to fetch venues', error: error.message });
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

export default router;
