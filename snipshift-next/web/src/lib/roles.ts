export type AppRole = 'professional' | 'business' | 'admin';

export const roleToRoute: Record<AppRole, string> = {
  professional: '/professional-dashboard',
  business: '/business-dashboard',
  admin: '/admin'
};

export function getDashboardRoute(role: AppRole | undefined | null): string {
  if (!role) return '/role-selection';
  return roleToRoute[role] || '/role-selection';
}

export function hasRole(roles: AppRole[] | undefined | null, role: AppRole): boolean {
  return !!roles && Array.isArray(roles) && roles.includes(role);
}


