/**
 * Professional Routes
 * 
 * API routes for professional dashboard features
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as jobsRepo from '../repositories/jobs.repository.js';

const router = Router();

/**
 * Format date and time for display
 * Returns a human-readable string like "Tomorrow, 9:00 AM - 5:00 PM" or "Dec 15, 2024, 9:00 AM - 5:00 PM"
 */
function formatDateTime(dateStr: string, startTimeStr: string, endTimeStr: string): string {
  try {
    // Parse date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return 'Date TBD';
    }

    // Combine date with time strings
    const startDateTime = new Date(`${dateStr}T${startTimeStr}`);
    const endDateTime = new Date(`${dateStr}T${endTimeStr}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return 'Date TBD';
    }

    // Format date part
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const jobDate = new Date(date);
    jobDate.setHours(0, 0, 0, 0);
    
    const diffTime = jobDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    let datePart: string;
    if (diffDays === 0) {
      datePart = 'Today';
    } else if (diffDays === 1) {
      datePart = 'Tomorrow';
    } else if (diffDays === -1) {
      datePart = 'Yesterday';
    } else {
      // Format as "MMM d, yyyy"
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      datePart = `${month} ${day}, ${year}`;
    }

    // Format time part
    const formatTime = (date: Date): string => {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
      return `${hours}:${minutesStr} ${ampm}`;
    };

    const startTimeFormatted = formatTime(startDateTime);
    const endTimeFormatted = formatTime(endDateTime);

    return `${datePart}, ${startTimeFormatted} - ${endTimeFormatted}`;
  } catch (error) {
    return 'Date TBD';
  }
}

/**
 * Format pay rate for display
 * Returns a string like "$35/hr"
 */
function formatPayRate(payRate: string | null | undefined): string {
  if (!payRate) {
    return 'Rate TBD';
  }
  
  const rate = parseFloat(payRate);
  if (isNaN(rate)) {
    return 'Rate TBD';
  }
  
  return `$${rate.toFixed(0)}/hr`;
}

/**
 * Format location from address components
 * Returns a string like "Richmond, VIC" or "123 Main St, Melbourne, VIC"
 */
function formatLocation(address: string | null, city: string | null, state: string | null): string {
  const parts = [address, city, state].filter(Boolean);
  if (parts.length === 0) {
    return 'Location TBD';
  }
  
  // If we have city and state, prefer that format
  if (city && state) {
    return `${city}, ${state}`;
  }
  
  return parts.join(', ');
}

/**
 * GET /api/professional/jobs
 * 
 * Fetch available jobs for professional dashboard with filtering
 * 
 * Query Parameters:
 * - location: Filter by city name
 * - minPayRate: Minimum pay rate (number)
 * - maxPayRate: Maximum pay rate (number)
 * - startDate: Start date for date range filter (YYYY-MM-DD)
 * - endDate: End date for date range filter (YYYY-MM-DD)
 * - jobType: Filter by job role ('barber' | 'hairdresser' | 'stylist' | 'other')
 * - limit: Number of results to return (default: 50)
 * - offset: Number of results to skip (default: 0)
 */
router.get('/jobs', asyncHandler(async (req, res) => {
  // Parse query parameters
  const location = req.query.location as string | undefined;
  const minPayRate = req.query.minPayRate ? parseFloat(req.query.minPayRate as string) : undefined;
  const maxPayRate = req.query.maxPayRate ? parseFloat(req.query.maxPayRate as string) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const jobType = req.query.jobType as 'barber' | 'hairdresser' | 'stylist' | 'other' | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  // Build filters for repository
  const filters: jobsRepo.JobFilters = {
    status: 'open', // Only return open jobs for professionals
    excludeExpired: true, // Exclude jobs that have already passed
    limit,
    offset,
  };

  // Apply filters
  if (location) {
    filters.city = location;
  }

  if (minPayRate !== undefined && !isNaN(minPayRate)) {
    filters.minRate = minPayRate;
  }

  if (maxPayRate !== undefined && !isNaN(maxPayRate)) {
    filters.maxRate = maxPayRate;
  }

  if (startDate) {
    filters.startDate = startDate;
  }

  if (endDate) {
    filters.endDate = endDate;
  }

  if (jobType) {
    filters.role = jobType;
  }

  // Fetch jobs from repository
  const result = await jobsRepo.getJobs(filters);

  if (!result) {
    // Database not available or error occurred
    res.status(200).json([]);
    return;
  }

  // Transform database results to match JobCardData interface
  const transformedJobs = result.data.map((job) => {
    // Format date string
    let dateStr: string;
    if (typeof job.date === 'string') {
      dateStr = job.date;
    } else if (job.date && typeof job.date === 'object' && 'toISOString' in job.date) {
      dateStr = (job.date as Date).toISOString().split('T')[0];
    } else {
      dateStr = String(job.date).split('T')[0];
    }

    // Format time strings (handle time type from database)
    // Time from database is typically in "HH:MM:SS" or "HH:MM:SS.mmm" format
    let startTimeStr = typeof job.startTime === 'string' 
      ? job.startTime 
      : String(job.startTime || '09:00:00');
    let endTimeStr = typeof job.endTime === 'string' 
      ? job.endTime 
      : String(job.endTime || '17:00:00');
    
    // Remove milliseconds if present and ensure proper format
    startTimeStr = startTimeStr.split('.')[0];
    endTimeStr = endTimeStr.split('.')[0];

    // Format dateTime
    const dateTime = formatDateTime(dateStr, startTimeStr, endTimeStr);

    // Format location
    const location = formatLocation(job.address || null, job.city || null, job.state || null);

    // Format pay rate
    const payRate = formatPayRate(job.payRate);

    return {
      id: job.id,
      title: job.title,
      location,
      payRate,
      dateTime,
    };
  });

  // Return transformed jobs
  res.status(200).json(transformedJobs);
}));

export default router;

