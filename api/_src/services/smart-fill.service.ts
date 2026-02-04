/**
 * Smart Fill Service
 * 
 * Automates the process of filling shifts with favorite staff members.
 * 
 * Workflow:
 * 1. Generate OPEN shifts based on `requiredStaffCount` from shift templates
 * 2. Fetch 'Favourite' staff who are available for those slots
 * 3. Distribute Favourites across the slots automatically
 * 4. Set shift status to 'invited' (pending invitation)
 * 
 * This service enables the "Invite A-Team" feature where venue owners
 * can quickly fill their roster with preferred workers.
 */

import * as shiftTemplatesRepo from '../repositories/shift-templates.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as venuesRepo from '../repositories/venues.repository.js';
import { getDb } from '../db/index.js';
import { shifts, shiftOffers, shiftInvitations } from '../db/schema.js';
import { eq, and, gte, lte, inArray, or } from 'drizzle-orm';
import { SHIFT_CONFIG } from '../config/business.config.js';

export interface SmartFillResult {
  shiftsCreated: number;
  shiftsAssigned: number;
  invitationsSent: number;
  errors: string[];
  assignmentDetails: Array<{
    shiftId: string;
    professionalId: string;
    professionalName: string;
    slotLabel: string;
    startTime: Date;
    endTime: Date;
  }>;
}

export interface SmartFillOptions {
  /** Date range start */
  startDate: Date;
  /** Date range end */
  endDate: Date;
  /** Default hourly rate for generated shifts */
  defaultHourlyRate?: string;
  /** Default location for generated shifts */
  defaultLocation?: string;
  /** Only assign to these professional IDs (optional, defaults to all favorites) */
  limitToProfessionalIds?: string[];
  /** If true, create shifts but don't send invitations yet (preview mode) */
  dryRun?: boolean;
}

/**
 * Build a Date from a base date + HH:mm time string
 */
function combineDateAndTime(baseDate: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Check if a professional is available for a given time slot
 * (not already assigned to another shift that overlaps)
 */
async function isProfessionalAvailable(
  db: ReturnType<typeof getDb>,
  professionalId: string,
  slotStart: Date,
  slotEnd: Date
): Promise<boolean> {
  // Check for any existing assignments that overlap with this time slot
  const overlapping = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(
      and(
        eq(shifts.assigneeId, professionalId),
        or(
          // Shift starts during our slot
          and(
            gte(shifts.startTime, slotStart),
            lte(shifts.startTime, slotEnd)
          ),
          // Shift ends during our slot
          and(
            gte(shifts.endTime, slotStart),
            lte(shifts.endTime, slotEnd)
          ),
          // Shift completely contains our slot
          and(
            lte(shifts.startTime, slotStart),
            gte(shifts.endTime, slotEnd)
          )
        ),
        // Only consider non-cancelled shifts
        inArray(shifts.status, ['pending', 'invited', 'open', 'filled', 'confirmed'])
      )
    )
    .limit(1);

  return overlapping.length === 0;
}

/**
 * Smart Fill - Automatically generate shifts and assign favorite professionals
 * 
 * @param employerId - The venue owner's user ID
 * @param options - Configuration options for the smart fill operation
 * @returns Result object with counts and details of what was created/assigned
 */
export async function smartFill(
  employerId: string,
  options: SmartFillOptions
): Promise<SmartFillResult> {
  const result: SmartFillResult = {
    shiftsCreated: 0,
    shiftsAssigned: 0,
    invitationsSent: 0,
    errors: [],
    assignmentDetails: [],
  };

  const db = getDb();
  const hourlyRate = options.defaultHourlyRate ?? SHIFT_CONFIG.DEFAULT_HOURLY_RATE;
  const location = options.defaultLocation ?? '';

  // 1. Get venue for the employer
  const venue = await venuesRepo.getVenueByUserId(employerId);
  if (!venue) {
    result.errors.push('Venue not found for this user');
    return result;
  }

  // 2. Get employer's favorite professionals
  const employer = await usersRepo.getUserById(employerId);
  if (!employer) {
    result.errors.push('Employer user not found');
    return result;
  }

  const favoriteProfessionalIds = (employer as any).favoriteProfessionals || [];
  
  // Apply limit filter if provided
  let targetProfessionalIds = favoriteProfessionalIds;
  if (options.limitToProfessionalIds && options.limitToProfessionalIds.length > 0) {
    targetProfessionalIds = favoriteProfessionalIds.filter(
      (id: string) => options.limitToProfessionalIds!.includes(id)
    );
  }

  if (targetProfessionalIds.length === 0) {
    result.errors.push('No favorite professionals configured. Add favorites from the Staff settings.');
    return result;
  }

  // 3. Fetch favorite professionals' details
  const professionals = await Promise.all(
    targetProfessionalIds.map((id: string) => usersRepo.getUserById(id))
  );
  const validProfessionals = professionals.filter(Boolean);

  if (validProfessionals.length === 0) {
    result.errors.push('No valid favorite professionals found');
    return result;
  }

  // 4. Get shift templates for the venue
  const templates = await shiftTemplatesRepo.getTemplatesByVenueId(venue.id);
  if (templates.length === 0) {
    result.errors.push('No shift templates configured. Set up your capacity in Calendar Settings first.');
    return result;
  }

  // 5. Get existing shifts in the date range to avoid duplicates
  const existingShifts = await shiftsRepo.getShiftsByEmployerInRange(
    employerId,
    options.startDate,
    options.endDate
  );

  // Index existing shifts by time slot
  const existingShiftsBySlot = new Map<string, number>();
  for (const shift of existingShifts) {
    const sStart = shift.startTime instanceof Date ? shift.startTime : new Date(shift.startTime);
    const sEnd = shift.endTime instanceof Date ? shift.endTime : new Date(shift.endTime);
    const slotKey = `${sStart.getTime()}-${sEnd.getTime()}`;
    existingShiftsBySlot.set(slotKey, (existingShiftsBySlot.get(slotKey) ?? 0) + 1);
  }

  // 6. Generate shifts and assign professionals
  const shiftsToCreate: Array<{
    employerId: string;
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    hourlyRate: string;
    status: 'invited';
    location?: string;
    templateId?: string;
    assigneeId?: string;
  }> = [];

  // Track professional assignments to distribute evenly (round-robin)
  const professionalAssignments = new Map<string, number>();
  validProfessionals.forEach(p => professionalAssignments.set(p!.id, 0));

  const current = new Date(options.startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(options.endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const baseDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0);

    for (const template of templates) {
      if (template.dayOfWeek !== dayOfWeek) continue;

      const slotStart = combineDateAndTime(baseDate, template.startTime);
      const slotEnd = combineDateAndTime(baseDate, template.endTime);

      if (slotEnd <= slotStart) {
        result.errors.push(`Invalid template ${template.label}: end before start`);
        continue;
      }

      // Check how many shifts already exist for this slot
      const slotKey = `${slotStart.getTime()}-${slotEnd.getTime()}`;
      const overlappingCount = existingShiftsBySlot.get(slotKey) ?? 0;
      const toCreate = Math.max(0, template.requiredStaffCount - overlappingCount);

      if (toCreate === 0) continue;

      // Assign professionals to each slot (round-robin distribution)
      for (let i = 0; i < toCreate; i++) {
        // Find the professional with the least assignments who is available
        let assignedProfessional = null;
        
        // Sort professionals by number of assignments (least first)
        const sortedProfessionals = [...validProfessionals]
          .filter(p => p !== null)
          .sort((a, b) => 
            (professionalAssignments.get(a!.id) ?? 0) - (professionalAssignments.get(b!.id) ?? 0)
          );

        for (const prof of sortedProfessionals) {
          if (!prof) continue;
          
          // Check availability (not already assigned to overlapping shift)
          const isAvailable = await isProfessionalAvailable(db, prof.id, slotStart, slotEnd);
          
          if (isAvailable) {
            assignedProfessional = prof;
            break;
          }
        }

        if (!assignedProfessional) {
          // No available professional for this slot - create as open
          shiftsToCreate.push({
            employerId,
            title: template.label,
            description: `Auto-generated from capacity template (${template.label})`,
            startTime: slotStart,
            endTime: slotEnd,
            hourlyRate,
            status: 'invited', // Will be converted to 'open' if no assignee
            location: location || undefined,
            templateId: template.id,
          });
        } else {
          // Assign the professional
          shiftsToCreate.push({
            employerId,
            title: template.label,
            description: `Auto-generated from capacity template (${template.label})`,
            startTime: slotStart,
            endTime: slotEnd,
            hourlyRate,
            status: 'invited',
            location: location || undefined,
            templateId: template.id,
            assigneeId: assignedProfessional.id,
          });

          // Update assignment count
          professionalAssignments.set(
            assignedProfessional.id,
            (professionalAssignments.get(assignedProfessional.id) ?? 0) + 1
          );

          // Track assignment details for response
          result.assignmentDetails.push({
            shiftId: '', // Will be filled after creation
            professionalId: assignedProfessional.id,
            professionalName: assignedProfessional.name || assignedProfessional.email || 'Unknown',
            slotLabel: template.label,
            startTime: slotStart,
            endTime: slotEnd,
          });
        }

        // Update the index to prevent duplicates within this batch
        existingShiftsBySlot.set(slotKey, (existingShiftsBySlot.get(slotKey) ?? 0) + 1);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  // 7. Create shifts and invitations in database
  if (options.dryRun) {
    result.shiftsCreated = shiftsToCreate.length;
    result.shiftsAssigned = shiftsToCreate.filter(s => s.assigneeId).length;
    return result;
  }

  if (shiftsToCreate.length > 0) {
    try {
      // Create shifts one by one to get IDs (batch insert doesn't return individual IDs easily)
      for (let i = 0; i < shiftsToCreate.length; i++) {
        const shiftData = shiftsToCreate[i];
        
        const [createdShift] = await db
          .insert(shifts)
          .values({
            employerId: shiftData.employerId,
            title: shiftData.title,
            description: shiftData.description,
            startTime: shiftData.startTime,
            endTime: shiftData.endTime,
            hourlyRate: shiftData.hourlyRate,
            status: shiftData.assigneeId ? 'invited' : 'open',
            location: shiftData.location,
            templateId: shiftData.templateId,
            assigneeId: shiftData.assigneeId,
          })
          .returning();

        result.shiftsCreated++;

        if (shiftData.assigneeId && createdShift) {
          result.shiftsAssigned++;

          // Create shift invitation record
          await db
            .insert(shiftInvitations)
            .values({
              shiftId: createdShift.id,
              professionalId: shiftData.assigneeId,
              status: 'PENDING',
            });

          result.invitationsSent++;

          // Update assignment details with actual shift ID
          const detailIndex = result.assignmentDetails.findIndex(
            d => d.professionalId === shiftData.assigneeId && 
                 d.startTime.getTime() === shiftData.startTime.getTime()
          );
          if (detailIndex >= 0) {
            result.assignmentDetails[detailIndex].shiftId = createdShift.id;
          }
        }
      }
    } catch (err) {
      result.errors.push(`Failed to create shifts: ${(err as Error).message}`);
    }
  }

  return result;
}

/**
 * Bulk update shifts from PENDING_INVITATION to OFFERED status
 * Triggered by "Invite A-Team" button
 * 
 * @param employerId - The venue owner's user ID
 * @param shiftIds - Optional specific shift IDs to update (defaults to all pending invitations)
 * @returns Number of shifts updated
 */
export async function sendInvitations(
  employerId: string,
  shiftIds?: string[]
): Promise<{ updated: number; errors: string[] }> {
  const db = getDb();
  const errors: string[] = [];

  try {
    // Build query conditions
    const conditions = [
      eq(shifts.employerId, employerId),
      eq(shifts.status, 'invited'),
    ];

    if (shiftIds && shiftIds.length > 0) {
      conditions.push(inArray(shifts.id, shiftIds));
    }

    // Update all matching shifts to 'open' (offered) status
    const updated = await db
      .update(shifts)
      .set({ 
        status: 'open',
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    // Update invitation records to reflect sent status
    if (updated.length > 0) {
      await db
        .update(shiftInvitations)
        .set({ status: 'PENDING' })
        .where(
          inArray(shiftInvitations.shiftId, updated.map(s => s.id))
        );
    }

    return { updated: updated.length, errors };
  } catch (err) {
    errors.push(`Failed to send invitations: ${(err as Error).message}`);
    return { updated: 0, errors };
  }
}

/**
 * Accept or decline a shift invitation (for professional/staff use)
 * 
 * @param professionalId - The professional's user ID
 * @param shiftId - The shift ID to accept/decline
 * @param accept - True to accept, false to decline
 */
export async function respondToInvitation(
  professionalId: string,
  shiftId: string,
  accept: boolean
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();

  try {
    // Get the shift
    const [shift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    if (!shift) {
      return { success: false, error: 'Shift not found' };
    }

    // Verify the invitation exists
    const [invitation] = await db
      .select()
      .from(shiftInvitations)
      .where(
        and(
          eq(shiftInvitations.shiftId, shiftId),
          eq(shiftInvitations.professionalId, professionalId)
        )
      )
      .limit(1);

    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    if (accept) {
      // Accept: Update shift status to filled/confirmed
      await db
        .update(shifts)
        .set({
          status: 'filled',
          assigneeId: professionalId,
          updatedAt: new Date(),
        })
        .where(eq(shifts.id, shiftId));

      // Update invitation status
      await db
        .update(shiftInvitations)
        .set({ status: 'ACCEPTED' })
        .where(eq(shiftInvitations.id, invitation.id));

      // Decline other invitations for this shift
      await db
        .update(shiftInvitations)
        .set({ status: 'EXPIRED' })
        .where(
          and(
            eq(shiftInvitations.shiftId, shiftId),
            inArray(shiftInvitations.status, ['PENDING'])
          )
        );
    } else {
      // Decline: Update invitation status
      await db
        .update(shiftInvitations)
        .set({ status: 'DECLINED' })
        .where(eq(shiftInvitations.id, invitation.id));

      // If this was the assigned professional, clear assignee
      if (shift.assigneeId === professionalId) {
        await db
          .update(shifts)
          .set({
            assigneeId: null,
            status: 'open',
            updatedAt: new Date(),
          })
          .where(eq(shifts.id, shiftId));
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
