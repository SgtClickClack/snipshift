/**
 * Settlement Routes
 * 
 * API endpoints for settlement management and D365/Workday reconciliation exports.
 * These endpoints are designed for enterprise integrations.
 */

import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import * as payoutsRepo from '../repositories/payouts.repository.js';
import * as ledgerRepo from '../repositories/financial-ledger.repository.js';
import { getDb } from '../db/index.js';
import { users, profiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/settlements/export
 * 
 * Export settlements for D365/Workday reconciliation.
 * Returns settlement data with all required fields for ERP system import.
 * 
 * Query Parameters:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - status: 'pending' | 'processing' | 'completed' | 'failed' (optional)
 * - settlementType: 'immediate' | 'batch' (optional)
 * - format: 'json' | 'csv' (optional, default: json)
 * 
 * Auth: Requires authenticated venue owner
 */
router.get('/export', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Verify user is a venue owner
  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!user || user.role !== 'business') {
    res.status(403).json({ message: 'Only venue owners can export settlements' });
    return;
  }

  // Parse query parameters
  const { startDate, endDate, status, settlementType, format } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ message: 'startDate and endDate are required' });
    return;
  }

  const parsedStartDate = new Date(startDate as string);
  const parsedEndDate = new Date(endDate as string);

  if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
    res.status(400).json({ message: 'Invalid date format. Use ISO 8601 format.' });
    return;
  }

  // Export settlements for the venue
  const settlements = await payoutsRepo.exportSettlementsForReconciliation({
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    status: status as 'pending' | 'processing' | 'completed' | 'failed' | undefined,
    settlementType: settlementType as 'immediate' | 'batch' | undefined,
    venueId: req.user.id,
  });

  // Return CSV format if requested
  if (format === 'csv') {
    const csvHeader = [
      'settlementId',
      'payoutId',
      'shiftId',
      'workerId',
      'venueId',
      'amountCents',
      'currency',
      'status',
      'settlementType',
      'stripeChargeId',
      'stripeTransferId',
      'processedAt',
      'createdAt',
      'shiftTitle',
      'shiftStartTime',
      'shiftEndTime',
      'hourlyRate',
      'hoursWorked',
    ].join(',');

    const csvRows = settlements.map(s => [
      s.settlementId,
      s.payoutId,
      s.shiftId,
      s.workerId,
      s.venueId,
      s.amountCents,
      s.currency,
      s.status,
      s.settlementType,
      s.stripeChargeId || '',
      s.stripeTransferId || '',
      s.processedAt?.toISOString() || '',
      s.createdAt.toISOString(),
      `"${(s.shiftTitle || '').replace(/"/g, '""')}"`,
      s.shiftStartTime?.toISOString() || '',
      s.shiftEndTime?.toISOString() || '',
      s.hourlyRate,
      s.hoursWorked,
    ].join(','));

    const csv = [csvHeader, ...csvRows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=settlements_${parsedStartDate.toISOString().slice(0,10)}_${parsedEndDate.toISOString().slice(0,10)}.csv`);
    res.send(csv);
    return;
  }

  // Default: JSON format
  res.status(200).json({
    exportedAt: new Date().toISOString(),
    dateRange: {
      start: parsedStartDate.toISOString(),
      end: parsedEndDate.toISOString(),
    },
    count: settlements.length,
    settlements,
  });
}));

/**
 * GET /api/settlements/:settlementId
 * 
 * Get details for a specific settlement by Settlement ID.
 * Includes associated ledger entries for full audit trail.
 */
router.get('/:settlementId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { settlementId } = req.params;
  const settlementIdStr = Array.isArray(settlementId) ? settlementId[0] : settlementId;

  if (!settlementIdStr || !settlementIdStr.startsWith('STL-')) {
    res.status(400).json({ message: 'Invalid settlement ID format' });
    return;
  }

  // Get payout by settlement ID
  const payout = await payoutsRepo.getPayoutBySettlementId(settlementIdStr);

  if (!payout) {
    res.status(404).json({ message: 'Settlement not found' });
    return;
  }

  // Verify user has access to this settlement (must be venue or worker)
  if (payout.venueId !== req.user.id && payout.workerId !== req.user.id) {
    res.status(403).json({ message: 'Access denied' });
    return;
  }

  // Get associated ledger entries
  const ledgerEntries = await ledgerRepo.getLedgerEntriesBySettlementId(settlementIdStr);

  res.status(200).json({
    settlement: {
      settlementId: payout.settlementId,
      payoutId: payout.id,
      shiftId: payout.shiftId,
      workerId: payout.workerId,
      venueId: payout.venueId,
      amountCents: payout.amountCents,
      status: payout.status,
      settlementType: payout.settlementType,
      stripeChargeId: payout.stripeChargeId,
      stripeTransferId: payout.stripeTransferId,
      hourlyRate: payout.hourlyRate,
      hoursWorked: payout.hoursWorked,
      processedAt: payout.processedAt,
      createdAt: payout.createdAt,
    },
    auditTrail: ledgerEntries.map((entry: any) => ({
      id: entry.id,
      entryType: entry.entryType,
      amountCents: entry.amountCents,
      currency: entry.currency,
      stripePaymentIntentId: entry.stripePaymentIntentId,
      stripeChargeId: entry.stripeChargeId,
      stripeTransferId: entry.stripeTransferId,
      createdAt: entry.createdAt,
    })),
  });
}));

/**
 * GET /api/settlements/ledger/export
 * 
 * Export financial ledger entries for reconciliation.
 * More detailed than settlement export - includes all ledger entry types.
 * 
 * Query Parameters:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - entryType: specific entry type to filter (optional)
 */
router.get('/ledger/export', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Verify user is a venue owner
  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!user || user.role !== 'business') {
    res.status(403).json({ message: 'Only venue owners can export ledger entries' });
    return;
  }

  const { startDate, endDate, entryType } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ message: 'startDate and endDate are required' });
    return;
  }

  const parsedStartDate = new Date(startDate as string);
  const parsedEndDate = new Date(endDate as string);

  if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
    res.status(400).json({ message: 'Invalid date format. Use ISO 8601 format.' });
    return;
  }

  const entries = await ledgerRepo.exportLedgerEntriesForReconciliation({
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    entryType: entryType as any,
  });

  // Filter to only show entries for this venue
  const venueEntries = entries.filter((e: any) => e.venueId === req.user!.id);

  res.status(200).json({
    exportedAt: new Date().toISOString(),
    dateRange: {
      start: parsedStartDate.toISOString(),
      end: parsedEndDate.toISOString(),
    },
    count: venueEntries.length,
    entries: venueEntries,
  });
}));

export default router;
