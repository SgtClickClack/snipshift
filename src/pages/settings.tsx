import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2
} from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import BusinessSettings from '@/components/settings/business-settings';
import { apiRequest } from '@/lib/queryClient';

type SettingsCategory = 'account' | 'security' | 'notifications' | 'verification' | 'business';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('account');
  const [isSaving, setIsSaving] = useState(false);

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

  // Notifications state
  const [notifications, setNotifications] = useState({
    newJobAlertsEmail: true,
    newJobAlertsSMS: false,
    shiftRemindersEmail: true,
    shiftRemindersSMS: true,
    marketingUpdatesEmail: false,
  });

  // Verification state (mock data)
  const [verificationStatus, setVerificationStatus] = useState({
    idUploaded: true,
    idExpired: false,
    licenseUploaded: true,
    licenseExpired: false,
  });

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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: 'Settings saved',
      description: 'Your notification preferences have been updated.',
    });
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

  // Check if user is a hub/business owner
  const isBusinessUser = user?.currentRole === 'hub' || user?.currentRole === 'business' || 
                         (user?.roles && (user.roles.includes('hub') || user.roles.includes('business')));

  const categories: Array<{ id: SettingsCategory; label: string; icon: typeof User }> = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'verification', label: 'Verification', icon: Shield },
    ...(isBusinessUser ? [{ id: 'business' as SettingsCategory, label: 'Business Settings', icon: Building2 }] : []),
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
                    return (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                          activeCategory === category.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {category.label}
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

            {/* Business Settings Section */}
            {activeCategory === 'business' && isBusinessUser && (
              <BusinessSettings
                initialData={businessSettings}
                onSave={() => {
                  // Settings are saved to database via the component
                  // User will be refreshed automatically
                }}
              />
            )}

            {/* Verification Section */}
            {activeCategory === 'verification' && (
              <Card>
                <CardHeader>
                  <CardTitle>Identity Verification</CardTitle>
                  <CardDescription>
                    Manage your ID and license verification status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* ID Verification */}
                    <div className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="rounded-full bg-muted p-2">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">Government ID</h3>
                              {verificationStatus.idUploaded ? (
                                verificationStatus.idExpired ? (
                                  <div className="flex items-center gap-1 text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm">Expired</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-sm">Verified</span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <XCircle className="h-4 w-4" />
                                  <span className="text-sm">Not Uploaded</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {verificationStatus.idUploaded
                                ? verificationStatus.idExpired
                                  ? 'Your ID has expired. Please upload a new one to continue using the platform.'
                                  : 'Your ID has been verified and is up to date.'
                                : 'Upload a valid government-issued ID to verify your identity.'}
                            </p>
                            <Button
                              variant={verificationStatus.idExpired ? 'default' : 'outline'}
                              size="sm"
                            >
                              {verificationStatus.idUploaded && !verificationStatus.idExpired
                                ? 'Re-upload ID'
                                : 'Upload ID'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* License Verification */}
                    <div className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="rounded-full bg-muted p-2">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">Professional License</h3>
                              {verificationStatus.licenseUploaded ? (
                                verificationStatus.licenseExpired ? (
                                  <div className="flex items-center gap-1 text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm">Expired</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-sm">Verified</span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <XCircle className="h-4 w-4" />
                                  <span className="text-sm">Not Uploaded</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {verificationStatus.licenseUploaded
                                ? verificationStatus.licenseExpired
                                  ? 'Your license has expired. Please upload a new one to continue working.'
                                  : 'Your professional license has been verified and is up to date.'
                                : 'Upload your professional license to verify your credentials.'}
                            </p>
                            <Button
                              variant={verificationStatus.licenseExpired ? 'default' : 'outline'}
                              size="sm"
                            >
                              {verificationStatus.licenseUploaded && !verificationStatus.licenseExpired
                                ? 'Re-upload License'
                                : 'Upload License'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

