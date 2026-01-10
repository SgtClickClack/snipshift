import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type MaybeProfileCompliance = {
  rsa_verified?: boolean;
  rsaVerified?: boolean;
  rsa_expiry?: string | null;
  rsaExpiry?: string | null;
};

type MaybeComplianceUser = {
  rsaVerified?: boolean | null;
  rsaExpiry?: string | null;
  profile?: MaybeProfileCompliance | null;
};

function parseLocalDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Compliance gate used to lock/unlock shift browsing.
 *
 * Rules:
 * - user.profile.rsa_verified (or equivalent) must be true
 * - current_date < user.profile.rsa_expiry (strictly before expiry date)
 */
export function useIsStaffCompliant(): boolean {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return false;

    const complianceUser = user as unknown as MaybeComplianceUser;

    const rsaVerified = Boolean(
      complianceUser.rsaVerified ??
        complianceUser.profile?.rsa_verified ??
        complianceUser.profile?.rsaVerified
    );

    const rsaExpiryRaw =
      complianceUser.rsaExpiry ??
      complianceUser.profile?.rsa_expiry ??
      complianceUser.profile?.rsaExpiry ??
      null;

    if (!rsaVerified) return false;
    if (!rsaExpiryRaw) return false;

    // Avoid "date-only parsed as UTC" issues by preferring local date parsing.
    const expiry =
      parseLocalDateOnly(rsaExpiryRaw) ?? new Date(String(rsaExpiryRaw));

    if (Number.isNaN(expiry.getTime())) return false;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return todayStart.getTime() < expiry.getTime();
  }, [user]);
}

