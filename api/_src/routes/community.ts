import { Router } from 'express';
import { authenticateUser, authenticateUserOptional, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { PostSchema, CommentSchema } from '../validation/schemas.js';
import * as postsRepo from '../repositories/posts.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import { normalizeParam } from '../utils/request-params.js';

const router = Router();

// Create a post (authenticated)
router.post('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = PostSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const postData = validationResult.data;

  // Create post
  const newPost = await postsRepo.createPost({
    authorId: userId,
    content: postData.content,
    imageUrl: postData.imageUrl,
    type: postData.type,
  });

  if (!newPost) {
    res.status(500).json({ message: 'Failed to create post' });
    return;
  }

  // Return with author info for immediate display
  res.status(201).json({
    ...newPost,
    authorName: req.user?.name,
    authorRole: req.user?.role,
    authorAvatar: undefined, // profileImage not available in user schema yet
    isLiked: false,
  });
}));

// Get community feed (public read)
router.get('/feed', authenticateUserOptional, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const type = req.query.type as 'community' | 'brand' | undefined;
  const userId = req.query.userId as string | undefined; // For checking "isLiked" status
  const authenticatedUserId = req.user?.id;

  const result = await postsRepo.getPosts({
    type,
    limit,
    offset,
  });

  if (!result) {
    res.status(200).json([]);
    return;
  }

  // Get liked posts for current user if provided
  let likedPostIds = new Set<string>();
  if (userId) {
    // SECURITY: Only allow a user to request their own like-state enrichment.
    // If no auth is present, we treat the endpoint as fully public and do not enrich.
    if (!authenticatedUserId) {
      likedPostIds = new Set();
    } else if (userId !== authenticatedUserId) {
      res.status(403).json({ message: 'Forbidden: You can only request your own like state' });
      return;
    } else {
      likedPostIds = await postsRepo.getUserLikedPosts(authenticatedUserId);
    }
  }

  // Enrich posts with author info
  const enrichedPosts = await Promise.all(result.data.map(async (post) => {
    const author = await usersRepo.getUserById(post.authorId);
    
    return {
      ...post,
      authorName: author?.name || 'Unknown User',
      authorRole: author?.role || 'professional',
      authorAvatar: undefined, // profileImage not available in user schema yet
      isLiked: likedPostIds.has(post.id),
    };
  }));

  res.status(200).json(enrichedPosts);
}));

// Toggle like on a post (authenticated)
router.post('/:postId/like', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const postId = normalizeParam(req.params.postId);
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const isLiked = await postsRepo.likePost(postId, userId);

  res.status(200).json({ 
    success: true, 
    isLiked,
    message: isLiked ? 'Post liked' : 'Post unliked' 
  });
}));

// Create a comment on a post (authenticated)
router.post('/:postId/comments', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const postId = normalizeParam(req.params.postId);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const validation = CommentSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ message: validation.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const newComment = await postsRepo.createComment({
    postId,
    authorId: userId,
    content: validation.data.content.trim(),
  });

  if (!newComment) {
    res.status(500).json({ message: 'Failed to create comment' });
    return;
  }

  // Return with author info
  res.status(201).json({
    ...newComment,
    authorName: req.user?.name,
    authorRole: req.user?.role,
    authorAvatar: undefined,
  });
}));

// Get comments for a post (public read)
router.get('/:postId/comments', asyncHandler(async (req, res) => {
  const postId = normalizeParam(req.params.postId);

  const comments = await postsRepo.getCommentsForPost(postId);

  // Enrich comments with author info
  const enrichedComments = await Promise.all(comments.map(async (comment) => {
    const author = await usersRepo.getUserById(comment.authorId);
    
    return {
      ...comment,
      authorName: author?.name || 'Unknown User',
      authorRole: author?.role || 'professional',
      authorAvatar: undefined,
    };
  }));

  res.status(200).json(enrichedComments);
}));

export default router;


