import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { TrainingModuleSchema, PurchaseSchema } from '../validation/schemas.js';
import * as trainingRepo from '../repositories/training-modules.repository.js';
import * as usersRepo from '../repositories/users.repository.js';

const router = Router();

// Upload training module (authenticated, trainer only)
router.post('/content', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Check if user is a trainer
  if (req.user?.role !== 'trainer' && req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Only trainers can upload content' });
    return;
  }

  // Validate request body
  const validationResult = TrainingModuleSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const moduleData = validationResult.data;

  // Create module
  const newModule = await trainingRepo.createTrainingModule({
    trainerId: userId,
    title: moduleData.title,
    description: moduleData.description,
    videoUrl: moduleData.videoUrl,
    thumbnailUrl: moduleData.thumbnailUrl,
    price: (moduleData.price || 0).toString(),
    duration: moduleData.duration,
    level: moduleData.level,
    category: moduleData.category,
  });

  if (!newModule) {
    res.status(500).json({ message: 'Failed to upload content' });
    return;
  }

  res.status(201).json(newModule);
}));

// Get training modules (public read)
router.get('/content', asyncHandler(async (req, res) => {
  const limitValue = req.query.limit;
  const limit = limitValue ? parseInt(Array.isArray(limitValue) ? limitValue[0] : limitValue, 10) : 20;
  const offsetValue = req.query.offset;
  const offset = offsetValue ? parseInt(Array.isArray(offsetValue) ? offsetValue[0] : offsetValue, 10) : 0;
  const trainerIdValue = req.query.trainerId;
  const trainerId = Array.isArray(trainerIdValue) ? trainerIdValue[0] : (trainerIdValue as string | undefined);
  const categoryValue = req.query.category;
  const category = Array.isArray(categoryValue) ? categoryValue[0] : (categoryValue as string | undefined);
  const levelValue = req.query.level;
  const level = Array.isArray(levelValue) ? (levelValue[0] as 'beginner' | 'intermediate' | 'advanced') : (levelValue as 'beginner' | 'intermediate' | 'advanced' | undefined);
  const isPaidValue = req.query.isPaid;
  const isPaidStr = Array.isArray(isPaidValue) ? isPaidValue[0] : (isPaidValue as string | undefined);
  
  let isPaid: boolean | undefined = undefined;
  if (isPaidStr === 'true') isPaid = true;
  if (isPaidStr === 'false') isPaid = false;

  // Handle legacy path (some frontend calls might use /training-content instead of /training/content)
  // But Express router handles the prefix, so this is fine

  const result = await trainingRepo.getTrainingModules({
    trainerId,
    category,
    level,
    isPaid,
    limit,
    offset,
  });

  if (!result) {
    res.status(200).json([]);
    return;
  }

  // Enrich with trainer info
  const enrichedModules = await Promise.all(result.data.map(async (module) => {
    const trainer = await usersRepo.getUserById(module.trainerId);
    
    return {
      ...module,
      trainerName: trainer?.name || 'Unknown Trainer',
      price: parseFloat(module.price), // Convert back to number for frontend
      isPaid: parseFloat(module.price) > 0,
    };
  }));

  res.status(200).json(enrichedModules);
}));

// Get module details (public read)
router.get('/content/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const module = await trainingRepo.getTrainingModuleById(id);

  if (!module) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }

  const trainer = await usersRepo.getUserById(module.trainerId);

  res.status(200).json({
    ...module,
    trainerName: trainer?.name || 'Unknown Trainer',
    price: parseFloat(module.price),
    isPaid: parseFloat(module.price) > 0,
  });
}));

// Purchase content (authenticated)
// Note: Frontend uses /api/purchase-content, we'll map this in index.ts or handle here
router.post('/purchase', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Frontend sends { contentId: string }
  const contentId = req.body.contentId || req.body.moduleId;
  
  if (!contentId) {
    res.status(400).json({ message: 'Content ID is required' });
    return;
  }

  // Verify content exists
  const content = await trainingRepo.getTrainingModuleById(contentId);
  if (!content) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }

  // In a real app, we would verify payment here via Stripe
  // For now, we assume payment was successful or content is free

  const purchase = await trainingRepo.purchaseModule(userId, contentId);

  if (!purchase) {
    // Might already be purchased, which is fine
    const existing = await trainingRepo.getPurchasedModules(userId);
    if (existing.includes(contentId)) {
      res.status(200).json({ message: 'Content already purchased', success: true });
      return;
    }
    
    res.status(500).json({ message: 'Failed to record purchase' });
    return;
  }

  res.status(201).json({ message: 'Purchase successful', success: true });
}));

// Get purchased content (authenticated)
router.get('/purchased', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const purchasedIds = await trainingRepo.getPurchasedModules(userId);

  res.status(200).json(purchasedIds);
}));

export default router;


