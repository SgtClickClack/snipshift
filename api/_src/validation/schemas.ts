import { z } from 'zod';

/**
 * Validation schemas for API request payloads
 * These schemas can be reused on both client and server for consistent validation
 * 
 * Force updated: 2025-11-19 - Ensure PurchaseSchema export for Vercel deployment
 */

/**
 * Schema for job creation and update payloads
 * Note: description, date, startTime, and endTime are required to match database constraints
 */
export const JobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  payRate: z.union([
    z.number().positive('Pay rate must be a positive number'),
    z.string().refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Pay rate must be a positive number'),
  ]),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  location: z.string().optional(),
  shopName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  lat: z.union([z.number(), z.string()]).optional(),
  lng: z.union([z.number(), z.string()]).optional(),
});

/**
 * Schema for application submission payloads
 */
export const ApplicationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  coverLetter: z.string().min(1, 'Cover letter is required'),
});

/**
 * Schema for application status updates
 */
export const ApplicationStatusSchema = z.enum(['pending', 'accepted', 'rejected'], {
  errorMap: () => ({ message: 'Status must be one of: pending, accepted, rejected' }),
});

/**
 * Schema for login/authentication payloads
 * Password is optional to support OAuth flows (Google, etc.) where authentication
 * is handled via Firebase ID tokens in the Authorization header
 */
export const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.union([
    z.string().min(1, 'Password is required'),
    z.literal(''),
  ]).optional(),
});

/**
 * Schema for purchase/subscription checkout payloads
 */
export const PurchaseSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

/**
 * Schema for job status updates
 */
export const JobStatusUpdateSchema = z.enum(['open', 'filled', 'closed', 'completed'], {
  errorMap: () => ({ message: 'Status must be one of: open, filled, closed, completed' }),
});

/**
 * Schema for review creation
 */
export const ReviewSchema = z.object({
  revieweeId: z.string().uuid('Invalid reviewee ID'),
  jobId: z.string().uuid('Invalid job ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000, 'Comment must be less than 1000 characters').optional(),
});

/**
 * Type exports for use in TypeScript code
 */
export type JobInput = z.infer<typeof JobSchema>;
export type ApplicationInput = z.infer<typeof ApplicationSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PurchaseInput = z.infer<typeof PurchaseSchema>;
export type JobStatusUpdate = z.infer<typeof JobStatusUpdateSchema>;
export type ReviewInput = z.infer<typeof ReviewSchema>;

