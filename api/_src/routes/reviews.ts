/**
 * Reviews Routes
 * 
 * Handles review creation and retrieval with double-blind anonymity
 */

import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as shiftReviewsRepo from '../repositories/shift-reviews.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import { z } from 'zod';

const router = Router();

const CreateReviewSchema = z.object({
  shiftId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  authorType: z.enum(['venue', 'worker']),
});

/**
 * POST /api/reviews
 * 
 * Create a new review for a completed shift
 * Implements double-blind: reviews are anonymous until both parties submit or 7 days pass
 */
router.post('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = CreateReviewSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      message: 'Validation error',
      errors: validationResult.error.errors,
    });
    return;
  }

  const { shiftId, rating, comment, authorType } = validationResult.data;

  // Get the shift
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Verify shift is completed
  if (shift.status !== 'completed' && shift.status !== 'pending_completion') {
    res.status(400).json({ 
      message: 'Can only review completed shifts',
      currentStatus: shift.status 
    });
    return;
  }

  // Determine review type and parties
  const isVenue = shift.employerId === userId;
  const isWorker = shift.assigneeId === userId;

  if (!isVenue && !isWorker) {
    res.status(403).json({ message: 'You are not authorized to review this shift' });
    return;
  }

  // Validate authorType matches user role
  if (authorType === 'venue' && !isVenue) {
    res.status(403).json({ message: 'Only the venue owner can submit venue reviews' });
    return;
  }

  if (authorType === 'worker' && !isWorker) {
    res.status(403).json({ message: 'Only the worker can submit worker reviews' });
    return;
  }

  // Determine review type and reviewee
  const reviewType = authorType === 'venue' ? 'SHOP_REVIEWING_BARBER' : 'BARBER_REVIEWING_SHOP';
  const revieweeId = authorType === 'venue' ? shift.assigneeId : shift.employerId;

  if (!revieweeId) {
    res.status(400).json({ message: 'Cannot review shift without assignee/employer' });
    return;
  }

  // Check for duplicate review
  const hasReviewed = await shiftReviewsRepo.hasUserReviewedShift(shiftId, userId, reviewType);
  if (hasReviewed) {
    res.status(409).json({ message: 'You have already reviewed this shift' });
    return;
  }

  // Create review (initially anonymous)
  const newReview = await shiftReviewsRepo.createShiftReview({
    shiftId,
    reviewerId: userId,
    revieweeId,
    type: reviewType,
    rating,
    comment,
  });

  if (!newReview) {
    res.status(500).json({ message: 'Failed to create review' });
    return;
  }

  // Check if both parties have now reviewed
  const bothReviewed = await shiftReviewsRepo.haveBothPartiesReviewed(shiftId);
  if (bothReviewed) {
    // Reveal both reviews immediately
    await shiftReviewsRepo.revealReviewsForShift(shiftId);
  }

  // Recalculate and update reviewee's rating
  await shiftReviewsRepo.updateUserRating(revieweeId);

  res.status(201).json({
    id: newReview.id,
    shiftId: newReview.shiftId,
    reviewerId: newReview.reviewerId,
    revieweeId: newReview.revieweeId,
    type: newReview.type,
    rating: parseInt(newReview.rating),
    comment: newReview.comment,
    isAnonymous: newReview.isAnonymous,
    revealedAt: newReview.revealedAt?.toISOString() || null,
    createdAt: newReview.createdAt.toISOString(),
  });
}));

/**
 * GET /api/users/:id/reviews
 * 
 * Fetch reviews for a specific user/venue
 * Respects anonymity: only shows reviewer details for non-anonymous reviews
 */
router.get('/users/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id: userId } = req.params;
  const { includeAnonymous } = req.query;

  if (!userId) {
    res.status(400).json({ message: 'User ID is required' });
    return;
  }

  // Get reviews for this user
  const reviews = await shiftReviewsRepo.getShiftReviewsForUser(userId, {
    includeAnonymous: includeAnonymous === 'true',
  });

  if (!reviews) {
    res.status(200).json([]);
    return;
  }

  // Transform for response
  const transformedReviews = reviews.map((review) => ({
    id: review.id,
    shiftId: review.shiftId,
    rating: parseFloat(review.rating),
    comment: review.comment,
    isAnonymous: review.isAnonymous,
    revealedAt: review.revealedAt?.toISOString() || null,
    createdAt: review.createdAt.toISOString(),
    // Reviewer info (null if anonymous)
    reviewer: review.isAnonymous && !includeAnonymous
      ? null
      : review.reviewer
        ? {
            id: review.reviewer.id,
            name: review.reviewer.name,
          }
        : null,
    // Shift info
    shift: review.shift
      ? {
          id: review.shift.id,
          title: review.shift.title,
        }
      : null,
  }));

  res.status(200).json(transformedReviews);
}));

export default router;
