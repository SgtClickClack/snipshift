import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Trash2, 
  LogOut,
  RefreshCw,
  Calendar,
  Copy,
  Check,
  Loader2,
  Star,
  Plug
} from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import BusinessSettings from '@/components/settings/business-settings';
const CapacityPlanner = lazy(() => import('@/components/settings/CapacityPlanner'));
import StaffPayRates from '@/components/settings/StaffPayRates';
import StaffFavourites from '@/components/settings/StaffFavourites';
import XeroIntegrationCard from '@/components/settings/XeroIntegrationCard';
import XeroEmployeeMapper from '@/components/settings/XeroEmployeeMapper';

const XeroSyncManager = lazy(() => import('@/components/settings/XeroSyncManager'));
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { RSALocker } from '@/components/profile/RSALocker';
import { GovernmentIDLocker } from '@/components/profile/GovernmentIDLocker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { mapRoleToApiRole, getDashboardRoute, AppRole } from '@/lib/roles';
import { getCalendarSyncUrl } from '@/lib/api/analytics/professional';

type SettingsCategory = 'account' | 'security' | 'notifications' | 'verification' | 'integrations' | 'a-team';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('account');
  const [isSaving, setIsSaving] = useState(false);
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [isLoadingCalendarUrl, setIsLoadingCalendarUrl] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Account form state
  const [accountData, setAccountData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
  });

  // Security form state
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Notifications state - load from user preferences
  const [notifications, setNotifications] = useState({
    newJobAlertsEmail: true,
    newJobAlertsSMS: false,
    shiftRemindersEmail: true,
    shiftRemindersSMS: true,
    marketingUpdatesEmail: false,
  });

  // Load notification preferences from user on mount
  useEffect(() => {
    if (user?.notificationPreferences) {
      setNotifications((prev) => ({
        ...prev,
        ...user.notificationPreferences,
      }));
    }
  }, [user?.notificationPreferences]);

  useEffect(() => {
    const category = searchParams.get('category');
    const valid: SettingsCategory[] = ['account', 'security', 'notifications', 'verification', 'integrations', 'a-team'];
    // Support both 'business' and 'integrations' URL params - map 'business' to 'integrations'
    if (category === 'business') {
      setActiveCategory('integrations');
    } else if (category && valid.includes(category as SettingsCategory)) {
      setActiveCategory(category as SettingsCategory);
    }
  }, [searchParams]);

  const [complianceData, setComplianceData] = useState({
    hospitalityRole: (user?.hospitalityRole || '') as
      | ''
      | 'Bartender'
      | 'Waitstaff'
      | 'Barista'
      | 'Kitchen Hand'
      | 'Manager',
    hourlyRatePreference:
      user?.hourlyRatePreference != null ? String(user.hourlyRatePreference) : '',
  });

  useEffect(() => {
    setComplianceData({
      hospitalityRole: (user?.hospitalityRole || '') as any,
      hourlyRatePreference:
        user?.hourlyRatePreference != null ? String(user.hourlyRatePreference) : '',
    });
  }, [user?.hospitalityRole, user?.hourlyRatePreference]);

  const handleComplianceSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest('PUT', '/api/me', {
        hospitalityRole: complianceData.hospitalityRole || undefined,
        hourlyRatePreference: complianceData.hourlyRatePreference || undefined,
      });
      await refreshUser();
      toast({
        title: 'Compliance details saved',
        description: 'Your RSA and hospitality details have been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to save compliance details.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccountSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: 'Settings saved',
      description: 'Your account information has been updated successfully.',
    });
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    
    setPasswordData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    
    toast({
      title: 'Password updated',
      description: 'Your password has been changed successfully.',
    });
  };

  const handleLogoutAllDevices = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: 'Logged out',
      description: 'You have been logged out of all devices.',
    });
  };

  const handleNotificationsSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest('PATCH', '/api/users/settings', {
        notificationPreferences: notifications,
      });
      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      toast({
        title: 'Failed to save',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: 'Account deletion requested',
      description: 'Your account deletion request has been submitted.',
      variant: 'destructive',
    });
  };

  const getRoleLabel = (role: string) => {
    if (role === 'hub' || role === 'business') return 'Business / Venue';
    if (role === 'client') return 'Client';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const handleRoleChange = async () => {
    if (!user || !selectedRole) return;

    setIsChangingRole(true);
    try {
      // Map frontend role to backend API role
      const apiRole = mapRoleToApiRole(selectedRole);
      
      await apiRequest("PATCH", `/api/users/${user.id}/current-role`, { role: apiRole });
      
      // Reload the page to reset dashboard access
      window.location.href = getDashboardRoute(selectedRole);
    } catch (error: any) {
      console.error("Failed to change role", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to change role. Please try again.",
        variant: "destructive",
      });
      setIsChangingRole(false);
      setRoleChangeDialogOpen(false);
    }
  };

  // Check if user is a hub/business owner
  const isBusinessUser = user?.currentRole === 'hub' || user?.currentRole === 'business' || 
                         (user?.roles && (user.roles.includes('hub') || user.roles.includes('business')));

  // Fetch favorites count for A-Team badge
  const { data: favoritesData } = useQuery({
    queryKey: ['favorite-professionals'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/me');
      if (!res.ok) return [];
      const data = await res.json();
      return data.favoriteProfessionals || [];
    },
    enabled: !!user?.id && isBusinessUser,
  });
  const favoritesCount = favoritesData?.length || 0;

  const categories: Array<{ id: SettingsCategory; label: string; icon: typeof User; badge?: number; highlight?: boolean }> = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'verification', label: 'Verification', icon: Shield },
    ...(isBusinessUser ? [
      { id: 'a-team' as SettingsCategory, label: 'A-Team', icon: Star, badge: favoritesCount },
      { id: 'integrations' as SettingsCategory, label: 'Integrations', icon: Plug, highlight: true },
    ] : []),
  ];

  // Load business settings from user profile
  const businessSettings = user?.businessSettings as any;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Settings" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences and security</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-2 md:space-y-1">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isATeam = category.id === 'a-team';
                    const isIntegrations = category.id === 'integrations';
                    // Show neon border when A-Team has 0 favorites (setup required)
                    const needsSetup = isATeam && (category.badge === undefined || category.badge === 0);
                    return (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        data-testid={`settings-tab-${category.id}`}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                          activeCategory === category.id
                            ? isATeam 
                              ? 'bg-yellow-500 text-white'
                              : isIntegrations
                                ? 'bg-[#BAFF39] text-black'
                                : 'bg-primary text-primary-foreground'
                            : isATeam
                              ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10'
                              : isIntegrations
                                ? 'text-[#BAFF39] hover:bg-[#BAFF39]/10 border border-[#BAFF39]/30'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        } ${
                          needsSetup && activeCategory !== category.id
                            ? 'border-2 border-[#BAFF39] animate-pulse shadow-[0_0_8px_rgba(186,255,57,0.4)]'
                            : ''
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isATeam ? (activeCategory === category.id ? 'fill-current' : 'fill-yellow-500/30') : ''} ${isIntegrations && activeCategory !== category.id ? 'text-[#BAFF39]' : ''}`} />
                        <span className="flex-1 text-left">{category.label}</span>
                        {isIntegrations && activeCategory !== category.id && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#BAFF39]/20 text-[#BAFF39] rounded font-bold">
                            Xero
                          </span>
                        )}
                        {isATeam && needsSetup && activeCategory !== category.id && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#BAFF39]/20 text-[#BAFF39] rounded font-bold animate-pulse">
                            Setup
                          </span>
                        )}
                        {category.badge !== undefined && category.badge > 0 && (
                          <Badge 
                            variant="secondary" 
                            className={`ml-auto ${
                              activeCategory === category.id
                                ? 'bg-white/20 text-white'
                                : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                            }`}
                          >
                            {category.badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Account Section */}
            {activeCategory === 'account' && (
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Update your personal details and account information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={accountData.name}
                        onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={accountData.email}
                        onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                        placeholder="Enter your email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={accountData.phone}
                        onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleAccountSave} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>

                  <Separator className="my-8" />

                  {/* Calendar Sync Section - Only for professional/worker users */}
                  {user?.currentRole === 'professional' && (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-6">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            Sync to Calendar
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Get an iCal feed URL to sync your accepted shifts with your personal calendar (Google Calendar, Apple Calendar, Outlook, etc.)
                          </p>
                          {!calendarUrl ? (
                            <Button
                              variant="outline"
                              onClick={async () => {
                                setIsLoadingCalendarUrl(true);
                                try {
                                  const response = await getCalendarSyncUrl();
                                  setCalendarUrl(response.calendarUrl);
                                } catch (error: any) {
                                  toast({
                                    title: 'Failed to generate calendar URL',
                                    description: error?.message || 'Please try again later',
                                    variant: 'destructive',
                                  });
                                } finally {
                                  setIsLoadingCalendarUrl(false);
                                }
                              }}
                              disabled={isLoadingCalendarUrl}
                            >
                              {isLoadingCalendarUrl ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Generate Calendar Sync URL
                                </>
                              )}
                            </Button>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
                                <code className="flex-1 text-sm break-all">{calendarUrl}</code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(calendarUrl);
                                      setCopiedToClipboard(true);
                                      setTimeout(() => setCopiedToClipboard(false), 2000);
                                      toast({
                                        title: 'Copied to clipboard',
                                        description: 'Calendar URL copied! Add it to your calendar app.',
                                      });
                                    } catch (error) {
                                      toast({
                                        title: 'Failed to copy',
                                        description: 'Please copy the URL manually',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                >
                                  {copiedToClipboard ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p><strong>How to use:</strong></p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                  <li>Google Calendar: Settings → Add calendar → From URL</li>
                                  <li>Apple Calendar: File → New Calendar Subscription → Paste URL</li>
                                  <li>Outlook: Add calendar → Subscribe from web → Paste URL</li>
                                </ul>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCalendarUrl(null)}
                              >
                                Generate New URL
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator className="my-8" />

                  {/* Role Management Section */}
                  {(() => {
                    const availableRoles = (user?.roles || []).filter(
                      (r) => r !== user?.currentRole && r !== 'client'
                    );
                    const hasMultipleRoles = availableRoles.length > 0;
                    
                    return (
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-6 text-steel-400">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-steel-400/10 p-2">
                            <RefreshCw className="h-5 w-5 text-steel-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-steel-400 mb-2">
                              Role Management
                            </h3>
                            <p className="text-sm text-steel-400/80 mb-4">
                              Current role: <span className="font-medium">{user?.currentRole ? getRoleLabel(user.currentRole) : 'Not set'}</span>
                            </p>
                            {hasMultipleRoles ? (
                              <>
                                <p className="text-sm text-steel-400/70 mb-4">
                                  If you made a mistake during onboarding, you can request a role change. 
                                  This will reset your dashboard access and redirect you to the appropriate dashboard.
                                </p>
                                <AlertDialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="text-steel-400 border-steel-400/30 hover:bg-steel-400/10"
                                      onClick={() => {
                                        setSelectedRole(null);
                                        setRoleChangeDialogOpen(true);
                                      }}
                                    >
                                      Request Role Change
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Request Role Change</AlertDialogTitle>
                                      <AlertDialogDescription className="space-y-2">
                                        <p>
                                          Changing your role will reset your dashboard access and redirect you to the new dashboard.
                                        </p>
                                        <p className="font-medium text-foreground pt-2">
                                          Select the role you want to switch to:
                                        </p>
                                        <div className="space-y-2 pt-2">
                                          {availableRoles.map((role) => (
                                            <button
                                              key={role}
                                              onClick={() => setSelectedRole(role as AppRole)}
                                              className={`w-full text-left px-4 py-2 rounded-md border transition-colors ${
                                                selectedRole === role
                                                  ? 'bg-primary text-primary-foreground border-primary'
                                                  : 'bg-background border-border hover:bg-muted'
                                              }`}
                                            >
                                              {getRoleLabel(role)}
                                            </button>
                                          ))}
                                        </div>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => {
                                        setSelectedRole(null);
                                        setRoleChangeDialogOpen(false);
                                      }}>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={handleRoleChange}
                                        disabled={!selectedRole || isChangingRole}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {isChangingRole ? 'Changing...' : 'Confirm Role Change'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            ) : (
                              <p className="text-sm text-steel-400/70">
                                You currently have only one role. To add additional roles, complete the onboarding process for those roles.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <Separator className="my-8" />

                  {/* Delete Account Section */}
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-destructive/10 p-2">
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-destructive mb-2">
                          Delete Account
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={isSaving}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Section */}
            {activeCategory === 'security' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="oldPassword">Current Password</Label>
                      <Input
                        id="oldPassword"
                        type="password"
                        value={passwordData.oldPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, oldPassword: e.target.value })
                        }
                        placeholder="Enter your current password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        placeholder="Enter your new password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        placeholder="Confirm your new password"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handlePasswordChange} disabled={isSaving}>
                        {isSaving ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                      Add an extra layer of security to your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="2fa">Enable Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">
                          Require a verification code in addition to your password
                        </p>
                      </div>
                      <Switch
                        id="2fa"
                        checked={twoFactorEnabled}
                        onCheckedChange={setTwoFactorEnabled}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Active Sessions</CardTitle>
                    <CardDescription>
                      Manage your active sessions across all devices
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Log out of all devices</Label>
                        <p className="text-sm text-muted-foreground">
                          This will sign you out of all devices except this one
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleLogoutAllDevices}
                        disabled={isSaving}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out All Devices
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notifications Section */}
            {activeCategory === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about important events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>New Job Alerts (Email)</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified via email when new jobs matching your preferences are posted
                        </p>
                      </div>
                      <Switch
                        checked={notifications.newJobAlertsEmail}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, newJobAlertsEmail: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>New Job Alerts (SMS)</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified via SMS when new jobs matching your preferences are posted
                        </p>
                      </div>
                      <Switch
                        checked={notifications.newJobAlertsSMS}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, newJobAlertsSMS: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Shift Reminders (Email)</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive email reminders before your scheduled shifts
                        </p>
                      </div>
                      <Switch
                        checked={notifications.shiftRemindersEmail}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, shiftRemindersEmail: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Shift Reminders (SMS)</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive SMS reminders before your scheduled shifts
                        </p>
                      </div>
                      <Switch
                        checked={notifications.shiftRemindersSMS}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, shiftRemindersSMS: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Marketing Updates (Email)</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates about new features, tips, and promotional offers
                        </p>
                      </div>
                      <Switch
                        checked={notifications.marketingUpdatesEmail}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, marketingUpdatesEmail: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleNotificationsSave} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* A-Team Section - Dedicated tab for favorites management */}
            {activeCategory === 'a-team' && isBusinessUser && (
              <div className="space-y-6">
                {/* A-Team Info Banner */}
                <Card className="border-2 border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5">
                  <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 p-3 bg-yellow-500/20 rounded-full">
                        <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400 fill-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">
                          Your A-Team
                        </h2>
                        <p className="text-muted-foreground">
                          Mark your most reliable staff as favorites to quickly fill shifts. 
                          Use "Invite A-Team" from the Calendar's Roster Tools to send bulk invitations 
                          to your favorite workers.
                        </p>
                        {favoritesCount === 0 && (
                          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 font-medium">
                            No favorites yet! Click the star icon next to staff members below to build your A-Team.
                          </p>
                        )}
                      </div>
                      {favoritesCount > 0 && (
                        <Badge className="shrink-0 bg-yellow-500 text-white text-lg px-3 py-1">
                          {favoritesCount} member{favoritesCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Staff Favorites Component */}
                <StaffFavourites />
              </div>
            )}

            {/* Integrations Section (formerly Business Settings) */}
            {activeCategory === 'integrations' && isBusinessUser && (
              <div className="space-y-6">
                <StaffPayRates />
                <XeroIntegrationCard />
                <XeroEmployeeMapper />
                <Suspense fallback={<Card><CardHeader><div className="h-6 w-48 animate-pulse rounded bg-muted" /><div className="h-4 w-32 mt-2 animate-pulse rounded bg-muted" /></CardHeader><CardContent className="space-y-4"><div className="h-10 w-full animate-pulse rounded bg-muted" /><div className="h-20 w-full animate-pulse rounded bg-muted" /></CardContent></Card>}>
                  <XeroSyncManager />
                </Suspense>
                <Suspense fallback={<Card><CardHeader><div className="h-6 w-40 animate-pulse rounded bg-muted" /><div className="h-4 w-64 mt-2 animate-pulse rounded bg-muted" /></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">{[1,2,3,4,5,6,7].map((i) => <div key={i} className="rounded-lg border p-4 space-y-3"><div className="h-4 w-12 animate-pulse rounded bg-muted" /><div className="h-20 w-full animate-pulse rounded bg-muted" /></div>)}</div></CardContent></Card>}>
                  <CapacityPlanner />
                </Suspense>
                <BusinessSettings
                  initialData={businessSettings}
                  onSave={() => {
                    // Settings are saved to database via the component
                    // User will be refreshed automatically
                  }}
                />
              </div>
            )}

            {/* Verification Section */}
            {activeCategory === 'verification' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Verification</CardTitle>
                    <CardDescription>
                      Upload your documents for verification. These are required to accept shifts.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <GovernmentIDLocker />
                
                <RSALocker />

                <Card>
                  <CardHeader>
                    <CardTitle>Hospitality Preferences</CardTitle>
                    <CardDescription>
                      Optional details that help match you with suitable shifts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hospitality Role</Label>
                        <Select
                          value={complianceData.hospitalityRole}
                          onValueChange={(value) =>
                            setComplianceData({
                              ...complianceData,
                              hospitalityRole: value as any,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bartender">Bartender</SelectItem>
                            <SelectItem value="Waitstaff">Waitstaff</SelectItem>
                            <SelectItem value="Barista">Barista</SelectItem>
                            <SelectItem value="Kitchen Hand">Kitchen Hand</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hourlyRatePreference">Hourly Rate Preference</Label>
                        <Input
                          id="hourlyRatePreference"
                          type="number"
                          step="0.01"
                          value={complianceData.hourlyRatePreference}
                          onChange={(e) =>
                            setComplianceData({
                              ...complianceData,
                              hourlyRatePreference: e.target.value,
                            })
                          }
                          placeholder="e.g. 45.00"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleComplianceSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

