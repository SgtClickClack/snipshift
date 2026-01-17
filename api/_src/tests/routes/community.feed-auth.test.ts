import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import type { Express } from 'express';

// Mock auth middleware: optional auth only sets req.user when header includes valid-token.
vi.mock('../../middleware/auth.js', () => ({
  authenticateUser: vi.fn((_req, res, _next) => {
    res.status(501).json({ message: 'Not used in this test' });
  }),
  authenticateUserOptional: vi.fn((req, _res, next) => {
    if (req.headers.authorization?.includes('valid-token')) {
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'professional',
        uid: 'firebase-uid-123',
      };
    }
    next();
  }),
  AuthenticatedRequest: {},
}));

const mockPostsRepo = {
  getPosts: vi.fn(),
  getUserLikedPosts: vi.fn(),
};
vi.mock('../../repositories/posts.repository.js', () => mockPostsRepo);

vi.mock('../../repositories/users.repository.js', () => ({
  getUserById: vi.fn(async () => ({ id: 'user-123', name: 'Test User', role: 'professional' })),
}));

describe('Community feed authZ (public feed + optional personalization)', () => {
  let app: Express;

  beforeAll(async () => {
    const communityRouter = await import('../../routes/community.js');
    app = express();
    app.use(express.json());
    app.use('/api/community', communityRouter.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not enrich like state when unauthenticated even if userId is provided', async () => {
    vi.mocked(mockPostsRepo.getPosts).mockResolvedValue({
      data: [{ id: 'post-1', authorId: 'author-1', createdAt: new Date(), content: 'hi' }],
      total: 1,
      limit: 20,
      offset: 0,
    } as any);
    vi.mocked(mockPostsRepo.getUserLikedPosts).mockResolvedValue(new Set(['post-1']) as any);

    const res = await supertest(app).get('/api/community/feed?userId=user-999').expect(200);
    expect(vi.mocked(mockPostsRepo.getUserLikedPosts)).not.toHaveBeenCalled();
    expect(res.body[0].isLiked).toBe(false);
  });

  it('rejects requesting another user’s like state when authenticated', async () => {
    vi.mocked(mockPostsRepo.getPosts).mockResolvedValue({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
    } as any);

    await supertest(app)
      .get('/api/community/feed?userId=user-999')
      .set('Authorization', 'Bearer valid-token')
      .expect(403);
  });

  it('enriches like state only for the authenticated user', async () => {
    vi.mocked(mockPostsRepo.getPosts).mockResolvedValue({
      data: [{ id: 'post-1', authorId: 'author-1', createdAt: new Date(), content: 'hi' }],
      total: 1,
      limit: 20,
      offset: 0,
    } as any);
    vi.mocked(mockPostsRepo.getUserLikedPosts).mockResolvedValue(new Set(['post-1']) as any);

    const res = await supertest(app)
      .get('/api/community/feed?userId=user-123')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(vi.mocked(mockPostsRepo.getUserLikedPosts)).toHaveBeenCalledWith('user-123');
    expect(res.body[0].isLiked).toBe(true);
  });
});

