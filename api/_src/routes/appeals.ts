/**
 * Appeals Routes
 * 
 * API routes for handling suspension appeals and medical certificate submissions.
 */

import { Router } from 'express';
import multer from 'multer';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as reputationService from '../lib/reputation-service.js';
import * as ocrService from '../services/ocr.service.js';
import * as usersRepo from '../repositories/users.repository.js';
import { getDb } from '../db/index.js';
import { getStorage } from 'firebase-admin/storage';
import admin from 'firebase-admin';

const router = Router();

// Configure multer for memory storage (files will be in req.files as buffers)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    
    if (isImage || isPdf) {
      cb(null, true);
      return;
    }
    cb(new Error('Medical certificate must be an image or PDF file'));
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for certificates
  },
});

/**
 * Appeal status enum for tracking
 */
export type AppealStatus = 'pending' | 'approved' | 'rejected' | 'manual_review';

/**
 * POST /api/appeals/upload-certificate
 * 
 * Upload a medical certificate to appeal a suspension.
 * 
 * Body (multipart/form-data):
 * - certificate: Image or PDF file of the medical certificate
 * - shiftId: The shift ID that caused the suspension
 * - additionalNotes: Optional notes from the professional
 * 
 * Process:
 * 1. Upload certificate to Firebase Storage
 * 2. Attempt OCR extraction
 * 3. If valid, apply medical override automatically
 * 4. If invalid/unreadable, flag for admin review
 */
router.post(
  '/upload-certificate',
  authenticateUser,
  upload.single('certificate'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    const userUid = req.user?.uid;

    if (!userId || !userUid) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const file = req.file;
    const { shiftId, additionalNotes } = req.body;

    if (!file) {
      res.status(400).json({ message: 'Medical certificate file is required' });
      return;
    }

    if (!shiftId) {
      res.status(400).json({ message: 'Shift ID is required' });
      return;
    }

    // Verify user is actually suspended
    const user = await usersRepo.getUserById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isSuspended = user.suspendedUntil && new Date(user.suspendedUntil) > new Date();
    if (!isSuspended) {
      res.status(400).json({ message: 'You are not currently suspended. No appeal needed.' });
      return;
    }

    // Upload certificate to Firebase Storage
    let certificateUrl: string;
    try {
      const bucket = getStorage().bucket();
      const timestamp = Date.now();
      const fileExtension = file.mimetype === 'application/pdf' ? 'pdf' : 
        (file.originalname.split('.').pop() || 'jpg');
      const fileName = `appeals/${userUid}/medical-certificate-${timestamp}.${fileExtension}`;
      const firebaseFile = bucket.file(fileName);

      await firebaseFile.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            uploadedBy: userId,
            shiftId,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make file accessible (or use signed URLs for more security)
      await firebaseFile.makePublic();
      certificateUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      console.log(`[APPEALS] Certificate uploaded for user ${userId}: ${certificateUrl}`);
    } catch (error: any) {
      console.error('[APPEALS] Failed to upload certificate:', error);
      res.status(500).json({ 
        message: 'Failed to upload certificate: ' + (error.message || 'Unknown error') 
      });
      return;
    }

    // Attempt OCR extraction (images only)
    let ocrResult: ocrService.OCRExtractionResult;
    if (file.mimetype.startsWith('image/')) {
      ocrResult = await ocrService.extractTextFromImage(file.buffer);
    } else {
      // PDF - flag for manual review
      ocrResult = {
        success: false,
        rawText: '',
        extractedData: {
          date: null,
          patientName: null,
          doctorName: null,
          isMedicalCertificate: false,
        },
        confidence: 0,
        error: 'PDF certificates require manual admin review.',
      };
    }

    // If OCR was successful and extracted required data
    if (ocrResult.success && ocrResult.extractedData.date && ocrResult.extractedData.patientName) {
      // Attempt automatic medical override
      const overrideResult = await reputationService.applyMedicalOverride(
        userId,
        shiftId,
        {
          date: ocrResult.extractedData.date,
          proName: ocrResult.extractedData.patientName,
          doctorName: ocrResult.extractedData.doctorName || undefined,
          valid: true,
          rawText: ocrResult.rawText,
          imageUrl: certificateUrl,
        }
      );

      if (overrideResult.success) {
        res.status(200).json({
          success: true,
          message: overrideResult.message,
          status: 'approved' as AppealStatus,
          details: {
            previousStrikes: overrideResult.previousStrikeCount,
            currentStrikes: overrideResult.strikeCount,
            suspensionLifted: overrideResult.suspensionLifted,
          },
        });
        return;
      }

      // Override failed validation - flag for manual review
      if (overrideResult.flaggedForReview) {
        await flagForAdminReview(userId, shiftId, certificateUrl, additionalNotes, overrideResult.message);
        
        res.status(200).json({
          success: false,
          message: overrideResult.message,
          status: 'manual_review' as AppealStatus,
          details: {
            reason: overrideResult.message,
            certificateUrl,
          },
        });
        return;
      }
    }

    // OCR failed or couldn't extract data - flag for manual admin review
    await flagForAdminReview(
      userId, 
      shiftId, 
      certificateUrl, 
      additionalNotes, 
      ocrResult.error || 'Certificate requires manual verification'
    );

    res.status(200).json({
      success: false,
      message: 'Your certificate has been submitted and is pending admin review. You will be notified once it has been processed.',
      status: 'manual_review' as AppealStatus,
      details: {
        reason: ocrResult.error || 'Automatic verification was not possible',
        certificateUrl,
        estimatedReviewTime: '24-48 hours',
      },
    });
  })
);

/**
 * GET /api/appeals/status
 * 
 * Get the status of the user's current appeal (if any).
 */
router.get(
  '/status',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await usersRepo.getUserById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isSuspended = user.suspendedUntil && new Date(user.suspendedUntil) > new Date();

    res.status(200).json({
      isSuspended,
      suspendedUntil: user.suspendedUntil,
      strikes: user.strikes ?? 0,
      // In a full implementation, you'd query an appeals table for pending appeals
      hasPendingAppeal: false, // TODO: Check appeals table when implemented
    });
  })
);

/**
 * Flag an appeal for manual admin review
 * 
 * Creates a notification for admin users and logs the appeal for later review.
 */
async function flagForAdminReview(
  userId: string,
  shiftId: string,
  certificateUrl: string,
  additionalNotes?: string,
  reason?: string
): Promise<void> {
  const db = getDb();
  if (!db) {
    console.error('[APPEALS] Database not available for flagging admin review');
    return;
  }

  const user = await usersRepo.getUserById(userId);
  if (!user) return;

  console.log(`[APPEALS] Flagging appeal for admin review:`, {
    userId,
    shiftId,
    certificateUrl,
    reason,
    additionalNotes,
  });

  // TODO: In a full implementation, create an appeals record in the database
  // For now, we'll create a notification for admin users
  
  // Get admin users to notify
  try {
    // Create a system notification/log for admin dashboard
    // This would typically go into an appeals/tickets table
    console.log(`[APPEALS] Medical certificate appeal submitted:
      User: ${user.name} (${user.email})
      User ID: ${userId}
      Shift ID: ${shiftId}
      Certificate: ${certificateUrl}
      Reason for review: ${reason}
      Additional notes: ${additionalNotes || 'None'}
      Submitted at: ${new Date().toISOString()}
    `);

    // Notify the user that their appeal is being reviewed
    try {
      // Import dynamically to avoid circular dependency
      const notificationsServiceModule = await import('../services/notifications-service.js');
      await notificationsServiceModule.createNotification(userId, {
        type: 'appeal_submitted',
        title: 'Medical Certificate Submitted',
        message: 'Your medical certificate has been submitted for review. An admin will review it within 24-48 hours.',
        data: {
          shiftId,
          certificateUrl,
          status: 'pending_review',
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (notifError) {
      console.error('[APPEALS] Failed to send appeal notification:', notifError);
    }

  } catch (error) {
    console.error('[APPEALS] Error flagging for admin review:', error);
  }
}

export default router;
