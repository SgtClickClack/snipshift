/**
 * Shift Templates Repository
 *
 * CRUD operations for shift capacity templates per venue/day
 */

import { eq, asc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { shiftTemplates } from '../db/schema/shift-templates.js';

export interface ShiftTemplate {
  id: string;
  venueId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiredStaffCount: number;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShiftTemplateInput {
  venueId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiredStaffCount: number;
  label: string;
}

export interface UpdateShiftTemplateInput {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  requiredStaffCount?: number;
  label?: string;
}

export async function getTemplatesByVenueId(venueId: string): Promise<ShiftTemplate[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(shiftTemplates)
    .where(eq(shiftTemplates.venueId, venueId))
    .orderBy(asc(shiftTemplates.dayOfWeek), asc(shiftTemplates.startTime));

  return rows as ShiftTemplate[];
}

export async function getTemplateById(id: string): Promise<ShiftTemplate | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(shiftTemplates)
    .where(eq(shiftTemplates.id, id))
    .limit(1);

  return row as ShiftTemplate | null;
}

export async function createTemplate(input: CreateShiftTemplateInput): Promise<ShiftTemplate | null> {
  const db = getDb();
  if (!db) return null;

  const [created] = await db
    .insert(shiftTemplates)
    .values({
      venueId: input.venueId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      requiredStaffCount: input.requiredStaffCount,
      label: input.label,
    })
    .returning();

  return created as ShiftTemplate | null;
}

export async function updateTemplate(
  id: string,
  input: UpdateShiftTemplateInput
): Promise<ShiftTemplate | null> {
  const db = getDb();
  if (!db) return null;

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (input.dayOfWeek !== undefined) updates.dayOfWeek = input.dayOfWeek;
  if (input.startTime !== undefined) updates.startTime = input.startTime;
  if (input.endTime !== undefined) updates.endTime = input.endTime;
  if (input.requiredStaffCount !== undefined) updates.requiredStaffCount = input.requiredStaffCount;
  if (input.label !== undefined) updates.label = input.label;

  const [updated] = await db
    .update(shiftTemplates)
    .set(updates as any)
    .where(eq(shiftTemplates.id, id))
    .returning();

  return updated as ShiftTemplate | null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db.delete(shiftTemplates).where(eq(shiftTemplates.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function deleteTemplatesByVenueId(venueId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const result = await db.delete(shiftTemplates).where(eq(shiftTemplates.venueId, venueId));
  return result.rowCount ?? 0;
}
