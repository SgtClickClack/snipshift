import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as postsRepo from '../repositories/posts.repository.js';
import * as usersRepo from '../repositories/users.repository.js';

const router = Router();

/**
 * POST /api/social-posts/:postId/like
 * Likes or unlikes a social post
 * This route must come before the /:userId route to avoid conflicts
 */
router.post('/:postId/like', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const { postId } = req.params;
  const { action } = req.body; // 'like' or 'unlike'

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Check if post exists
  const post = await postsRepo.getPostById(postId);
  if (!post) {
    res.status(404).json({ message: 'Post not found' });
    return;
  }

  // Toggle like
  const isLiked = await postsRepo.likePost(postId, userId);

  // Return success response
  res.status(200).json({
    success: true,
    isLiked,
    action: isLiked ? 'liked' : 'unliked',
  });
}));

/**
 * GET /api/social-posts
 * GET /api/social-posts/:userId
 * Fetches social posts, optionally filtered by userId
 */
router.get('/:userId?', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userIdParam = req.params.userId;
  const userIdQueryValue = req.query.userId;
  const userIdQuery = Array.isArray(userIdQueryValue) ? userIdQueryValue[0] : userIdQueryValue;
  const userId = userIdParam || (userIdQuery as string | undefined);
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // If userId is provided, filter by that user's posts
  // Otherwise, get all brand-type posts
  const filters: postsRepo.PostFilters = {
    type: 'brand',
    authorId: userId,
    limit: 100,
    offset: 0,
  };

  const result = await postsRepo.getPosts(filters);

  if (!result) {
    res.status(200).json([]);
    return;
  }

  // Get user's liked posts for this user
  const userLikedPosts = await postsRepo.getUserLikedPosts(currentUserId);
  const likedPostIds = new Set(userLikedPosts);

  // Transform posts to match frontend SocialPost interface
  const transformedPosts = await Promise.all(
    result.data.map(async (post) => {
      // Get author info
      const author = await usersRepo.getUserById(post.authorId);
      
      return {
        id: post.id,
        authorId: post.authorId,
        postType: (post as any).postType || 'announcement', // Default if not in schema
        content: post.content,
        imageUrl: post.imageUrl || undefined,
        linkUrl: (post as any).linkUrl || undefined,
        status: (post as any).status || 'approved', // Default to approved
        likes: Number(post.likesCount || 0),
        comments: [], // Comments can be fetched separately if needed
        discountCode: (post as any).discountCode || undefined,
        discountPercentage: (post as any).discountPercentage || undefined,
        validUntil: (post as any).validUntil || undefined,
        createdAt: post.createdAt.toISOString(),
        authorName: author?.name,
        authorCompany: author?.name, // Use name as company for now
      };
    })
  );

  res.status(200).json(transformedPosts);
}));

/**
 * POST /api/social-posts
 * Creates a new social post
 */
router.post('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const {
    postType,
    content,
    imageUrl,
    linkUrl,
    discountCode,
    discountPercentage,
    validUntil,
    eventTime,
    location,
  } = req.body;

  // Validate required fields
  if (!content || !postType) {
    res.status(400).json({ message: 'Content and postType are required' });
    return;
  }

  // Create post using posts repository
  // Store additional fields in a JSON field or extend schema later
  const newPost = await postsRepo.createPost({
    authorId: userId,
    content,
    imageUrl: imageUrl || undefined,
    type: 'brand', // Social posts are brand-type posts
  });

  if (!newPost) {
    res.status(500).json({ message: 'Failed to create post' });
    return;
  }

  // Get author info
  const author = await usersRepo.getUserById(userId);

  // Return transformed post matching frontend interface
  res.status(201).json({
    id: newPost.id,
    authorId: newPost.authorId,
    postType: postType || 'announcement',
    content: newPost.content,
    imageUrl: newPost.imageUrl || undefined,
    linkUrl: linkUrl || undefined,
    status: 'pending', // New posts start as pending
    likes: 0,
    comments: [],
    discountCode: discountCode || undefined,
    discountPercentage: discountPercentage || undefined,
    validUntil: validUntil || undefined,
    createdAt: newPost.createdAt.toISOString(),
    authorName: author?.name,
    authorCompany: author?.name,
  });
}));

export default router;

