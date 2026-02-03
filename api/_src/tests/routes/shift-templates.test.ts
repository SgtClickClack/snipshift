/**
 * Shift Templates API Tests
 * Verifies CRUD endpoints for capacity planning templates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

const { mockAuthUser, mockVenuesRepo, mockShiftTemplatesRepo } = vi.hoisted(() => {
  const mockAuthUser = vi.fn((req: any, _res: any, next: any) => {
    req.user = {
      id: 'user-123',
      email: 'shop@example.com',
      name: 'Shop Owner',
      role: 'business',
      uid: 'firebase-uid-123',
    };
    next();
  });
  const mockVenuesRepo = {
    getVenueByUserId: vi.fn(),
  };
  const mockShiftTemplatesRepo = {
    getTemplatesByVenueId: vi.fn(),
    getTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  };
  return { mockAuthUser, mockVenuesRepo, mockShiftTemplatesRepo };
});

vi.mock('../../middleware/auth.js', () => ({
  authenticateUser: mockAuthUser,
  requireBusinessOwner: mockAuthUser,
  AuthenticatedRequest: {},
}));

vi.mock('../../repositories/venues.repository.js', () => mockVenuesRepo);
vi.mock('../../repositories/shift-templates.repository.js', () => mockShiftTemplatesRepo);

import shiftTemplatesRouter from '../../routes/shift-templates.js';

const app = express();
app.use(express.json());
app.use('/api/shift-templates', shiftTemplatesRouter);

describe('Shift Templates API', () => {
  const mockVenue = {
    id: 'venue-123',
    userId: 'user-123',
    venueName: 'Test Venue',
  };

  const mockTemplate = {
    id: 'template-123',
    venueId: 'venue-123',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    requiredStaffCount: 3,
    label: 'Morning Bar',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVenuesRepo.getVenueByUserId.mockResolvedValue(mockVenue);
  });

  describe('GET /api/shift-templates', () => {
    it('returns templates for user venue', async () => {
      mockShiftTemplatesRepo.getTemplatesByVenueId.mockResolvedValue([mockTemplate]);

      const res = await supertest(app).get('/api/shift-templates');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: mockTemplate.id,
        venueId: mockTemplate.venueId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        requiredStaffCount: 3,
        label: 'Morning Bar',
      });
      expect(mockShiftTemplatesRepo.getTemplatesByVenueId).toHaveBeenCalledWith('venue-123');
    });

    it('returns 404 when user has no venue', async () => {
      mockVenuesRepo.getVenueByUserId.mockResolvedValue(null);

      const res = await supertest(app).get('/api/shift-templates');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Venue not found');
    });
  });

  describe('POST /api/shift-templates', () => {
    it('creates a template with valid input', async () => {
      mockShiftTemplatesRepo.createTemplate.mockResolvedValue(mockTemplate);

      const res = await supertest(app)
        .post('/api/shift-templates')
        .send({
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          requiredStaffCount: 3,
          label: 'Morning Bar',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        requiredStaffCount: 3,
        label: 'Morning Bar',
      });
      expect(mockShiftTemplatesRepo.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          venueId: 'venue-123',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          requiredStaffCount: 3,
          label: 'Morning Bar',
        })
      );
    });

    it('returns 400 for invalid dayOfWeek', async () => {
      const res = await supertest(app)
        .post('/api/shift-templates')
        .send({
          dayOfWeek: 7,
          startTime: '09:00',
          endTime: '17:00',
          requiredStaffCount: 1,
          label: 'Shift',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid requiredStaffCount', async () => {
      const res = await supertest(app)
        .post('/api/shift-templates')
        .send({
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          requiredStaffCount: 0,
          label: 'Shift',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/shift-templates/:id', () => {
    it('updates a template', async () => {
      mockShiftTemplatesRepo.getTemplateById.mockResolvedValue(mockTemplate);
      mockShiftTemplatesRepo.updateTemplate.mockResolvedValue({
        ...mockTemplate,
        label: 'Updated Bar',
      });

      const res = await supertest(app)
        .put('/api/shift-templates/template-123')
        .send({ label: 'Updated Bar' });

      expect(res.status).toBe(200);
      expect(res.body.label).toBe('Updated Bar');
    });

    it('returns 404 for non-existent template', async () => {
      mockShiftTemplatesRepo.getTemplateById.mockResolvedValue(null);

      const res = await supertest(app)
        .put('/api/shift-templates/non-existent')
        .send({ label: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/shift-templates/:id', () => {
    it('deletes a template', async () => {
      mockShiftTemplatesRepo.getTemplateById.mockResolvedValue(mockTemplate);
      mockShiftTemplatesRepo.deleteTemplate.mockResolvedValue(true);

      const res = await supertest(app).delete('/api/shift-templates/template-123');

      expect(res.status).toBe(204);
      expect(mockShiftTemplatesRepo.deleteTemplate).toHaveBeenCalledWith('template-123');
    });

    it('returns 404 for non-existent template', async () => {
      mockShiftTemplatesRepo.getTemplateById.mockResolvedValue(null);

      const res = await supertest(app).delete('/api/shift-templates/non-existent');

      expect(res.status).toBe(404);
    });
  });
});
