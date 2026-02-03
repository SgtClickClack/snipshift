/**
 * Shift Templates API
 * CRUD for capacity requirements per venue/day
 * All routes require authenticateUser + requireBusinessOwner
 */

import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest, requireBusinessOwner } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { normalizeParam } from '../utils/request-params.js';
import * as shiftTemplatesRepo from '../repositories/shift-templates.repository.js';
import * as venuesRepo from '../repositories/venues.repository.js';

const router = Router();

function toTemplateResponse(t: {
  id: string;
  venueId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiredStaffCount: number;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    venueId: t.venueId,
    dayOfWeek: t.dayOfWeek,
    startTime: t.startTime,
    endTime: t.endTime,
    requiredStaffCount: t.requiredStaffCount,
    label: t.label,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/**
 * GET /api/shift-templates
 * List templates for user's venue(s)
 */
router.get(
  '/',
  authenticateUser,
  requireBusinessOwner,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const venue = await venuesRepo.getVenueByUserId(userId);
    if (!venue) {
      res.status(404).json({ message: 'Venue not found' });
      return;
    }

    const templates = await shiftTemplatesRepo.getTemplatesByVenueId(venue.id);
    res.status(200).json(templates.map(toTemplateResponse));
  })
);

/**
 * POST /api/shift-templates
 * Create a new template
 */
router.post(
  '/',
  authenticateUser,
  requireBusinessOwner,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const venue = await venuesRepo.getVenueByUserId(userId);
    if (!venue) {
      res.status(404).json({ message: 'Venue not found' });
      return;
    }

    const { dayOfWeek, startTime, endTime, requiredStaffCount, label } = req.body;

    if (
      typeof dayOfWeek !== 'number' ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      typeof startTime !== 'string' ||
      !/^\d{1,2}:\d{2}$/.test(startTime) ||
      typeof endTime !== 'string' ||
      !/^\d{1,2}:\d{2}$/.test(endTime) ||
      typeof requiredStaffCount !== 'number' ||
      requiredStaffCount < 1 ||
      typeof label !== 'string' ||
      label.trim().length === 0
    ) {
      res.status(400).json({
        message:
          'Invalid input: dayOfWeek (0-6), startTime (HH:mm), endTime (HH:mm), requiredStaffCount (>=1), label required',
      });
      return;
    }

    const template = await shiftTemplatesRepo.createTemplate({
      venueId: venue.id,
      dayOfWeek,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      requiredStaffCount,
      label: label.trim().slice(0, 128),
    });

    if (!template) {
      res.status(500).json({ message: 'Failed to create template' });
      return;
    }

    res.status(201).json(toTemplateResponse(template));
  })
);

/**
 * PUT /api/shift-templates/:id
 * Update a template
 */
router.put(
  '/:id',
  authenticateUser,
  requireBusinessOwner,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const venue = await venuesRepo.getVenueByUserId(userId);
    if (!venue) {
      res.status(404).json({ message: 'Venue not found' });
      return;
    }

    const id = normalizeParam(req.params.id);
    const existing = await shiftTemplatesRepo.getTemplateById(id);
    if (!existing) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    if (existing.venueId !== venue.id) {
      res.status(403).json({ message: 'Forbidden: Template belongs to another venue' });
      return;
    }

    const { dayOfWeek, startTime, endTime, requiredStaffCount, label } = req.body;
    const updates: Record<string, unknown> = {};

    if (dayOfWeek !== undefined) {
      if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
        res.status(400).json({ message: 'dayOfWeek must be 0-6' });
        return;
      }
      updates.dayOfWeek = dayOfWeek;
    }
    if (startTime !== undefined) {
      if (typeof startTime !== 'string' || !/^\d{1,2}:\d{2}$/.test(startTime)) {
        res.status(400).json({ message: 'startTime must be HH:mm' });
        return;
      }
      updates.startTime = startTime.trim();
    }
    if (endTime !== undefined) {
      if (typeof endTime !== 'string' || !/^\d{1,2}:\d{2}$/.test(endTime)) {
        res.status(400).json({ message: 'endTime must be HH:mm' });
        return;
      }
      updates.endTime = endTime.trim();
    }
    if (requiredStaffCount !== undefined) {
      if (typeof requiredStaffCount !== 'number' || requiredStaffCount < 1) {
        res.status(400).json({ message: 'requiredStaffCount must be >= 1' });
        return;
      }
      updates.requiredStaffCount = requiredStaffCount;
    }
    if (label !== undefined) {
      if (typeof label !== 'string' || label.trim().length === 0) {
        res.status(400).json({ message: 'label is required' });
        return;
      }
      updates.label = label.trim().slice(0, 128);
    }

    const updated = await shiftTemplatesRepo.updateTemplate(id, updates as any);
    if (!updated) {
      res.status(500).json({ message: 'Failed to update template' });
      return;
    }

    res.status(200).json(toTemplateResponse(updated));
  })
);

/**
 * DELETE /api/shift-templates/:id
 * Delete a template
 */
router.delete(
  '/:id',
  authenticateUser,
  requireBusinessOwner,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const venue = await venuesRepo.getVenueByUserId(userId);
    if (!venue) {
      res.status(404).json({ message: 'Venue not found' });
      return;
    }

    const id = normalizeParam(req.params.id);
    const existing = await shiftTemplatesRepo.getTemplateById(id);
    if (!existing) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    if (existing.venueId !== venue.id) {
      res.status(403).json({ message: 'Forbidden: Template belongs to another venue' });
      return;
    }

    await shiftTemplatesRepo.deleteTemplate(id);
    res.status(204).send();
  })
);

export default router;
