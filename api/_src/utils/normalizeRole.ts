/**
 * Global role normalization for users table writes.
 * Every route that writes to the users table must pass role through this before DB.
 *
 * Maps: hub, venue, brand → 'business'
 *       staff, worker → 'professional'
 * All other accepted values pass through; invalid/empty → 'pending_onboarding'.
 */
export type NormalizedRole =
  | 'professional'
  | 'business'
  | 'admin'
  | 'trainer'
  | 'hub'
  | 'pending_onboarding';

export function normalizeRole(
  role: string | null | undefined
): NormalizedRole {
  if (!role) return 'pending_onboarding';
  const normalized = String(role).toLowerCase();
  if (normalized === 'venue' || normalized === 'hub' || normalized === 'brand') return 'business';
  if (normalized === 'staff' || normalized === 'worker') return 'professional';
  const accepted: NormalizedRole[] = [
    'professional',
    'business',
    'admin',
    'trainer',
    'hub',
    'pending_onboarding',
  ];
  if (accepted.includes(normalized as NormalizedRole)) {
    return normalized as NormalizedRole;
  }
  return 'pending_onboarding';
}
