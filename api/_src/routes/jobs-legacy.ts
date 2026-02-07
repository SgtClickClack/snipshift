/**
 * Legacy Jobs CRUD Routes
 *
 * [DEPRECATED] These endpoints are deprecated in favor of /api/shifts.
 * The Hub Dashboard now posts to the Shifts API.
 * These routes are maintained for legacy client compatibility only.
 */

import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { JobSchema, ApplicationSchema } from '../validation/schemas.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as applicationsRepo from '../repositories/applications.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as notificationsRepo from '../repositories/notifications.repository.js';
import * as notificationService from '../services/notification.service.js';
import { normalizeParam } from '../utils/request-params.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────

type LegacyJobRole = 'barber' | 'hairdresser' | 'stylist' | 'other';

/**
 * Normalize HospoGo-era role values into the legacy job role enum stored in the `jobs` table.
 */
function toLegacyJobRole(role: unknown): LegacyJobRole {
  if (!role) return 'barber';
  switch (role) {
    case 'barber':
    case 'hairdresser':
    case 'stylist':
    case 'other':
      return role as LegacyJobRole;
    default:
      return 'other';
  }
}

/**
 * Geocode a city name to coordinates using OpenStreetMap Nominatim.
 * Returns coordinates or null if geocoding fails.
 */
async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedCity = encodeURIComponent(cityName);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedCity}&format=json&limit=1&addressdetails=1`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'HospoGo/1.0' },
    });

    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      typeof (data[0] as { lat?: unknown }).lat === 'string' &&
      typeof (data[0] as { lon?: unknown }).lon === 'string'
    ) {
      const first = data[0] as { lat: string; lon: string };
      return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// ── Routes ───────────────────────────────────────────────────────────

// Create a job
router.post('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validationResult = JobSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const jobData = validationResult.data;
  const payRate = typeof jobData.payRate === 'string' ? jobData.payRate : jobData.payRate.toString();

  let address = jobData.address;
  let city = jobData.city;
  let state = jobData.state;
  let locationString = jobData.location;

  if (jobData.location && !address) {
    const parts = jobData.location.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      state = parts[parts.length - 1];
      city = parts[parts.length - 2];
      if (parts.length > 2) {
        address = parts.slice(0, -2).join(', ');
      }
    } else if (parts.length === 1) {
      city = parts[0];
    }
    locationString = jobData.location;
  } else if (address || city || state) {
    const locationParts = [address, city, state].filter(Boolean);
    locationString = locationParts.join(', ');
  }

  let lat = jobData.lat ? (typeof jobData.lat === 'string' ? parseFloat(jobData.lat) : jobData.lat) : undefined;
  let lng = jobData.lng ? (typeof jobData.lng === 'string' ? parseFloat(jobData.lng) : jobData.lng) : undefined;

  if (!lat || !lng) {
    if (city) {
      const cityCoords: Record<string, { lat: number; lng: number }> = {
        'New York': { lat: 40.7128, lng: -74.0060 },
        'Los Angeles': { lat: 34.0522, lng: -118.2437 },
        'Chicago': { lat: 41.8781, lng: -87.6298 },
        'Houston': { lat: 29.7604, lng: -95.3698 },
        'Phoenix': { lat: 33.4484, lng: -112.0740 },
      };
      const coords = cityCoords[city];
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      } else {
        lat = 40.7128;
        lng = -74.0060;
      }
    } else {
      lat = 40.7128;
      lng = -74.0060;
    }
  }

  const newJob = await jobsRepo.createJob({
    businessId: userId,
    title: jobData.title,
    payRate,
    description: jobData.description!,
    date: jobData.date!,
    startTime: jobData.startTime!,
    endTime: jobData.endTime!,
    role: toLegacyJobRole(jobData.role),
    shopName: jobData.shopName,
    address,
    city,
    state,
    lat: lat?.toString(),
    lng: lng?.toString(),
  });

  if (newJob) {
    const locationParts = [newJob.address, newJob.city, newJob.state].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

    res.status(201).json({
      id: newJob.id,
      title: newJob.title,
      shopName: newJob.shopName,
      rate: newJob.payRate,
      payRate: newJob.payRate,
      description: newJob.description,
      date: newJob.date,
      lat: newJob.lat ? parseFloat(newJob.lat) : undefined,
      lng: newJob.lng ? parseFloat(newJob.lng) : undefined,
      location,
      startTime: newJob.startTime,
      endTime: newJob.endTime,
      role: newJob.role,
      hubId: newJob.businessId,
      businessId: newJob.businessId,
    });
    return;
  }

  res.status(503).json({ message: 'Database not available. Cannot create job.' });
}));

// Fetch jobs
router.get('/', asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const businessId = req.query.businessId as string | undefined;
  const status = req.query.status as 'open' | 'filled' | 'closed' | undefined;
  let city = req.query.city as string | undefined;
  const date = req.query.date as string | undefined;

  const search = req.query.search as string | undefined;
  const role = req.query.role as 'barber' | 'hairdresser' | 'stylist' | 'other' | undefined;
  const minRate = req.query.minRate ? parseFloat(req.query.minRate as string) : undefined;
  const maxRate = req.query.maxRate ? parseFloat(req.query.maxRate as string) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  let radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;
  let lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  let lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

  if (city && !lat && !lng) {
    const coords = await geocodeCity(city);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      if (!radius) radius = 50;
      city = undefined;
    }
  }

  const result = await jobsRepo.getJobs({
    businessId, status, limit, offset, city, date, role, search,
    minRate, maxRate, startDate, endDate, radius, lat, lng,
    excludeExpired: true,
  });

  if (result) {
    const transformedJobs = result.data.map((job) => {
      const locationParts = [job.address, job.city, job.state].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;
      return {
        id: job.id, title: job.title, shopName: job.shopName,
        rate: job.payRate, date: job.date,
        lat: job.lat ? parseFloat(job.lat) : undefined,
        lng: job.lng ? parseFloat(job.lng) : undefined,
        location, payRate: job.payRate, description: job.description,
        startTime: job.startTime, endTime: job.endTime, role: job.role,
        hubId: job.businessId, businessId: job.businessId,
      };
    });

    if (limit !== undefined || offset !== undefined) {
      res.status(200).json({ data: transformedJobs, total: result.total, limit: result.limit, offset: result.offset });
    } else {
      res.status(200).json(transformedJobs);
    }
    return;
  }

  res.status(200).json([]);
}));

// Fetch single job
router.get('/:id', asyncHandler(async (req, res) => {
  const id = normalizeParam(req.params.id);
  const job = await jobsRepo.getJobById(id);
  if (job) {
    const locationParts = [job.address, job.city, job.state].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;
    const businessOwner = await usersRepo.getUserById(job.businessId);

    res.status(200).json({
      id: job.id, title: job.title, shopName: job.shopName,
      rate: job.payRate, payRate: job.payRate, description: job.description,
      date: job.date,
      lat: job.lat ? parseFloat(job.lat) : undefined,
      lng: job.lng ? parseFloat(job.lng) : undefined,
      location, startTime: job.startTime, endTime: job.endTime,
      role: job.role, status: job.status, businessId: job.businessId,
      hubId: job.businessId,
      businessName: businessOwner?.name || job.shopName || 'Business Owner',
    });
    return;
  }

  res.status(404).json({ message: 'Job not found' });
}));

// Update a job
router.put('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const validationResult = JobSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }

  const existingJob = await jobsRepo.getJobById(id);
  if (existingJob) {
    if (existingJob.businessId !== userId) {
      res.status(403).json({ message: 'Forbidden: You do not own this job' });
      return;
    }
  } else {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  const jobData = validationResult.data;
  const payRate = typeof jobData.payRate === 'string' ? jobData.payRate : jobData.payRate.toString();

  const updatedJob = await jobsRepo.updateJob(id, {
    title: jobData.title, payRate,
    description: jobData.description!, date: jobData.date!,
    startTime: jobData.startTime!, endTime: jobData.endTime!,
    role: toLegacyJobRole(jobData.role),
  });

  if (updatedJob) {
    const locationParts = [updatedJob.address, updatedJob.city, updatedJob.state].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

    res.status(200).json({
      id: updatedJob.id, title: updatedJob.title, shopName: updatedJob.shopName,
      rate: updatedJob.payRate, payRate: updatedJob.payRate,
      description: updatedJob.description, date: updatedJob.date,
      lat: updatedJob.lat ? parseFloat(updatedJob.lat) : undefined,
      lng: updatedJob.lng ? parseFloat(updatedJob.lng) : undefined,
      location, startTime: updatedJob.startTime, endTime: updatedJob.endTime,
      role: updatedJob.role,
    });
    return;
  }

  res.status(404).json({ message: 'Job not found' });
}));

// Delete a job
router.delete('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const existingJob = await jobsRepo.getJobById(id);
  if (existingJob) {
    if (existingJob.businessId !== userId) {
      res.status(403).json({ message: 'Forbidden: You do not own this job' });
      return;
    }
  } else {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  const deleted = await jobsRepo.deleteJob(id);
  if (deleted) {
    res.status(204).send();
    return;
  }

  res.status(404).json({ message: 'Job not found' });
}));

// Apply to a job
router.post('/:id/apply', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const jobId = normalizeParam(req.params.id);

  const validationResult = ApplicationSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }

  const { name, email, coverLetter } = validationResult.data;
  const userId = req.user?.id;

  const job = await jobsRepo.getJobById(jobId);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  const hasApplied = await applicationsRepo.hasUserAppliedToJob(jobId, userId, email);
  if (hasApplied) {
    res.status(409).json({ message: 'You have already applied to this job' });
    return;
  }

  const newApplication = await applicationsRepo.createApplication({
    jobId, userId, name, email, coverLetter,
  });

  if (newApplication) {
    if (job) {
      const jobOwnerId = job.businessId;
      if (jobOwnerId) {
        await notificationService.notifyApplicationReceived(jobOwnerId, name, job.title, jobId);
      }
    }

    res.status(201).json({ message: 'Application submitted successfully!', id: newApplication.id });
    return;
  }

  res.status(201).json({ message: 'Application submitted successfully!' });
}));

export default router;
