import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export type VerificationStatus = {
  rsaUploaded: boolean;
  idVerifiedStatus: string | null;
  isVerified: boolean;
  hasUploadedDocuments: boolean;
  isPendingAudit: boolean;
};

type Options = {
  /**
   * If true, automatically redirects away from protected browse routes when not verified.
   * Defaults to true.
   */
  enableRedirect?: boolean;
  /**
   * Which paths should be protected by this verification gate.
   * Defaults to ['/browse-shifts'] (alias route).
   */
  protectedPaths?: string[];
  /**
   * Redirect destination when not verified.
   * Defaults to '/onboarding'.
   */
  redirectTo?: string;
};

/**
 * Staff verification hook.
 *
 * Current rules (as requested):
 * - profiles.rsa_cert_url must be present (RSA uploaded)
 * - profiles.id_verified_status must be 'APPROVED' (Government ID audited)
 *
 * If verification fails, this hook can redirect users away from protected browse routes.
 */
export function useVerificationStatus(options: Options = {}): VerificationStatus {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    enableRedirect = true,
    protectedPaths = ['/browse-shifts'],
    redirectTo = '/onboarding',
  } = options;

  const status = useMemo<VerificationStatus>(() => {
    const rsaUploaded = Boolean(user?.profile?.rsa_cert_url || user?.rsaCertificateUrl);
    const idVerifiedStatus = user?.profile?.id_verified_status ?? null;
    const isVerified = rsaUploaded && idVerifiedStatus === 'APPROVED';

    const hasUploadedDocuments =
      rsaUploaded || Boolean(user?.profile?.id_document_url);
    const isPendingAudit = hasUploadedDocuments && !isVerified;

    return {
      rsaUploaded,
      idVerifiedStatus,
      isVerified,
      hasUploadedDocuments,
      isPendingAudit,
    };
  }, [
    user?.profile?.id_document_url,
    user?.profile?.id_verified_status,
    user?.profile?.rsa_cert_url,
    user?.rsaCertificateUrl,
  ]);

  useEffect(() => {
    if (!enableRedirect) return;
    if (!user) return;
    if (status.isVerified) return;

    const isProtected = protectedPaths.includes(location.pathname);
    if (!isProtected) return;

    navigate(redirectTo, { replace: true });
  }, [enableRedirect, location.pathname, navigate, protectedPaths, redirectTo, status.isVerified, user]);

  return status;
}

