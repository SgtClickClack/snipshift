/**
 * Shared analytics API functions (used by both domains)
 * Extracted from analytics.ts for domain separation
 */
import { apiRequest } from '../../queryClient';

function toApiErrorFromModule(error: unknown, context: string): Error {
  if (error instanceof Error) {
    const wrapped = new Error(`${context}: ${error.message}`);
    (wrapped as any).isAuthError = (error as any).isAuthError;
    (wrapped as any).shouldNotReload = (error as any).shouldNotReload;
    return wrapped;
  }
  return new Error(`${context}: Unknown error`);
}

// Enterprise Leads
export interface EnterpriseLeadData {
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  numberOfLocations?: number;
  inquiryType?: 'enterprise_plan' | 'custom_solution' | 'partnership' | 'general';
  message?: string;
}

export interface EnterpriseLeadResponse {
  success: boolean;
  message: string;
  leadId: string;
}

/**
 * Submit an enterprise lead from the ContactSalesForm
 */
export async function submitEnterpriseLead(data: EnterpriseLeadData): Promise<EnterpriseLeadResponse> {
  try {
    const res = await apiRequest('POST', '/api/leads/enterprise', data);
    return await res.json();
  } catch (error) {
    throw toApiErrorFromModule(error, 'submitEnterpriseLead');
  }
}
