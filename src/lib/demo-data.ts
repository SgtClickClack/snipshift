/**
 * Demo Mode Data Bypass
 * 
 * When DEMO_MODE is true, components will return hardcoded data
 * instead of making API calls. This allows the dashboard to render
 * immediately for demos without requiring backend connectivity.
 * 
 * Activation methods:
 * 1. URL parameter: ?demo=true
 * 2. Environment variable: VITE_DEMO_MODE=true
 * 3. localStorage flag: localStorage.setItem('demo_mode', 'true')
 * 
 * ENTERPRISE FEATURES (Atomic Settlement Engine):
 * - Settlement IDs: Each completed shift has a unique STL-YYYYMMDD-XXXXXX code
 * - Productivity Ready: Workers show compliance status for enterprise clients (Endeavour, AVC)
 * - Payout data: Completed shifts include immediate settlement details
 */

// Generate a demo Settlement ID
function generateDemoSettlementId(dateOffset: number = 0): string {
  const date = new Date(Date.now() + dateOffset);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `STL-${dateStr}-${randomPart}`;
}

// Check if demo mode is active
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('demo') === 'true') return true;
  
  // Check environment variable
  if (import.meta.env.VITE_DEMO_MODE === 'true') return true;
  
  // Check localStorage
  if (localStorage.getItem('demo_mode') === 'true') return true;
  
  return false;
}

// Demo User Data
export const DEMO_USER = {
  id: 'demo-user-001',
  uid: 'demo-user-001',
  email: 'demo@hospogo.com',
  displayName: 'Demo Venue',
  roles: ['hub', 'business'] as Array<'hub' | 'business'>,
  currentRole: 'hub' as const,
  isOnboarded: true,
  hasCompletedOnboarding: true,
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  bannerUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&h=400&fit=crop',
  bio: 'Premium hospitality venue in the heart of the city. We specialize in craft cocktails and fine dining experiences.',
  location: 'Sydney, NSW',
  phone: '+61 2 9000 0000',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date(),
};

// Demo Venue Status Data
export const DEMO_VENUE = {
  id: 'venue-demo-001',
  userId: 'demo-user-001',
  venueName: 'Demo Bar & Restaurant',
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: new Date().toISOString(),
};

/**
 * Demo Jobs/Shifts – multi-worker capacity for bypass
 *
 * When isDemoMode() is true, components use DEMO_JOBS instead of API. Each job has:
 * - capacity: staff required (1–5); varies to show 0/X, X/Y, and “Add Worker” in the calendar.
 * - assignedStaff: array of { id, name, displayName?, avatarUrl? }. Bypass logic passes these through.
 */
export const DEMO_JOBS = [
  {
    id: 'job-001',
    _type: 'shift',
    title: 'Weekend Bartender',
    description: 'Looking for an experienced bartender for our busy weekend service. Must have RSA certification.',
    status: 'open',
    payRate: 35,
    hourlyRate: 35,
    capacity: 2,
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 26 * 60 * 60 * 1000).toISOString(),
    location: { address: '123 Demo Street', city: 'Sydney', state: 'NSW' },
    skillsRequired: ['Cocktail Making', 'RSA', 'Customer Service'],
    applicationCount: 5,
    applicants: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
    employerId: 'demo-user-001',
    businessId: 'demo-user-001',
    assignedStaff: [] as Array<{ id: string; name?: string; displayName?: string; avatarUrl?: string }>,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'job-002',
    _type: 'shift',
    title: 'Floor Staff',
    description: 'Friendly and energetic floor staff needed for evening service.',
    status: 'filled',
    payRate: 30,
    hourlyRate: 30,
    capacity: 3,
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000).toISOString(),
    location: { address: '123 Demo Street', city: 'Sydney', state: 'NSW' },
    skillsRequired: ['Customer Service', 'Team Player'],
    applicationCount: 3,
    applicants: [{ id: '1' }, { id: '2' }, { id: '3' }],
    assigneeId: 'worker-001',
    assignedStaff: [
      { id: 'worker-001', name: 'Sarah Johnson', displayName: 'Sarah Johnson', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
      { id: 'worker-003', name: 'James Taylor', displayName: 'James Taylor', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
      { id: 'worker-004', name: 'Emma Williams', displayName: 'Emma Williams', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
    ],
    employerId: 'demo-user-001',
    businessId: 'demo-user-001',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'job-003',
    _type: 'shift',
    title: 'Kitchen Hand',
    description: 'Assist with food prep and kitchen cleanup during busy service.',
    status: 'completed',
    payRate: 28,
    hourlyRate: 28,
    capacity: 2,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
    location: { address: '123 Demo Street', city: 'Sydney', state: 'NSW' },
    skillsRequired: ['Food Handling', 'Cleaning'],
    applicationCount: 2,
    applicants: [{ id: '1' }, { id: '2' }],
    assigneeId: 'worker-002',
    assignedStaff: [
      { id: 'worker-002', name: 'Mike Chen', displayName: 'Mike Chen', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' },
      { id: 'worker-005', name: 'Alex Rivera', displayName: 'Alex Rivera', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
    ],
    employerId: 'demo-user-001',
    businessId: 'demo-user-001',
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    // ATOMIC SETTLEMENT DATA - D365/Workday reconciliation ready
    paymentStatus: 'PAID',
    payout: {
      id: 'payout-demo-001',
      settlementId: generateDemoSettlementId(-1 * 24 * 60 * 60 * 1000), // Yesterday's date
      amountCents: 16800, // 6 hours × $28 × 100
      hoursWorked: 6,
      hourlyRate: 28,
      status: 'completed',
      settlementType: 'immediate',
      stripeChargeId: 'ch_demo_3P4Q5R6S7T8U',
      stripeTransferId: 'tr_demo_A1B2C3D4E5F6',
      processedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000).toISOString(),
    },
  },
  // Partial fill: 2/5 – shows "2/5 Filled" and Add Worker placeholder in calendar
  {
    id: 'job-004',
    _type: 'shift',
    title: 'Event Bar Team',
    description: 'Bar team for private event. Two confirmed, three more needed.',
    status: 'filled',
    payRate: 38,
    hourlyRate: 38,
    capacity: 5,
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 22 * 60 * 60 * 1000).toISOString(),
    location: { address: '123 Demo Street', city: 'Sydney', state: 'NSW' },
    skillsRequired: ['Bartending', 'RSA', 'Events'],
    applicationCount: 4,
    applicants: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
    assigneeId: 'worker-006',
    assignedStaff: [
      { id: 'worker-006', name: 'Jordan Lee', displayName: 'Jordan Lee', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop' },
      { id: 'worker-007', name: 'Sam Kim', displayName: 'Sam Kim', avatarUrl: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop' },
    ],
    employerId: 'demo-user-001',
    businessId: 'demo-user-001',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo Applications Data
export const DEMO_APPLICATIONS = [
  {
    id: 'app-001',
    name: 'Michael Chen',
    email: 'michael@example.com',
    status: 'pending',
    appliedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    coverLetter: 'I have 3 years of bartending experience at premium venues. I specialize in craft cocktails and have excellent customer service skills.',
    userId: 'worker-001',
    job: DEMO_JOBS[0],
    shift: null,
  },
  {
    id: 'app-002',
    name: 'Emma Williams',
    email: 'emma@example.com',
    status: 'pending',
    appliedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    coverLetter: 'Looking to pick up extra shifts. Available all weekends and have RSA certification.',
    userId: 'worker-003',
    job: DEMO_JOBS[0],
    shift: null,
  },
  {
    id: 'app-003',
    name: 'James Taylor',
    email: 'james@example.com',
    status: 'accepted',
    appliedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    coverLetter: 'Experienced floor staff with 5 star reviews on HospoGo.',
    userId: 'worker-004',
    job: DEMO_JOBS[1],
    shift: null,
  },
];

// Demo Dashboard Stats
export const DEMO_STATS = {
  summary: {
    openJobs: 2,
    totalApplications: 5,
    unreadMessages: 3,
    monthlyHires: 8,
    totalEarnings: 12500,
    completedShifts: 15,
    averageRating: 4.8,
    reviewCount: 23,
  },
};

// Demo Shift Applications (for CandidatesDialog)
export const DEMO_SHIFT_APPLICATIONS = [
  {
    id: 'shift-app-001',
    shiftId: 'job-001',
    userId: 'worker-001',
    name: 'Michael Chen',
    email: 'michael@example.com',
    status: 'pending' as const,
    appliedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    coverLetter: 'I have 3 years of bartending experience at premium venues.',
    applicant: {
      displayName: 'Michael Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      rating: 4.9,
    },
  },
  {
    id: 'shift-app-002',
    shiftId: 'job-001',
    userId: 'worker-003',
    name: 'Emma Williams',
    email: 'emma@example.com',
    status: 'pending' as const,
    appliedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    coverLetter: 'Available all weekends. RSA certified.',
    applicant: {
      displayName: 'Emma Williams',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      rating: 4.7,
    },
  },
];

/**
 * Demo Workers with Productivity Ready Status
 * 
 * For enterprise clients (Endeavour, AVC), workers must be "Productivity Ready":
 * - idVerified: Government ID verified (APPROVED)
 * - vevoVerified: Australian work rights verified (VEVO check)
 * - productivityReady: TRUE only when both are verified
 */
export const DEMO_WORKERS = [
  {
    id: 'worker-001',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    role: 'PROFESSIONAL',
    // PRODUCTIVITY READY - Cleared for enterprise clients
    productivityReady: true,
    productivityReadyAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    idVerifiedStatus: 'APPROVED',
    vevoVerified: true,
    vevoCheckType: 'citizen',
    rsaVerified: true,
    rating: 4.9,
    completedShifts: 47,
    reliabilityScore: 98,
    badges: ['Top Rated', 'Verified'],
  },
  {
    id: 'worker-002',
    name: 'Mike Chen',
    email: 'mike@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    role: 'PROFESSIONAL',
    // PRODUCTIVITY READY - Cleared for enterprise clients
    productivityReady: true,
    productivityReadyAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    idVerifiedStatus: 'APPROVED',
    vevoVerified: true,
    vevoCheckType: 'permanent_resident',
    rsaVerified: true,
    rating: 4.8,
    completedShifts: 32,
    reliabilityScore: 95,
    badges: ['Verified'],
  },
  {
    id: 'worker-003',
    name: 'Emma Williams',
    email: 'emma@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    role: 'PROFESSIONAL',
    // PENDING - Not yet cleared for enterprise clients
    productivityReady: false,
    productivityReadyAt: null,
    idVerifiedStatus: 'APPROVED',
    vevoVerified: false, // VEVO check pending
    vevoCheckType: null,
    rsaVerified: true,
    rating: 4.7,
    completedShifts: 15,
    reliabilityScore: 92,
    badges: [],
    missingRequirements: ['VEVO work rights verification required'],
  },
  {
    id: 'worker-004',
    name: 'James Taylor',
    email: 'james@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    role: 'PROFESSIONAL',
    // PRODUCTIVITY READY - Cleared for enterprise clients
    productivityReady: true,
    productivityReadyAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    idVerifiedStatus: 'APPROVED',
    vevoVerified: true,
    vevoCheckType: 'citizen',
    rsaVerified: true,
    rating: 4.9,
    completedShifts: 89,
    reliabilityScore: 99,
    badges: ['Top Rated', 'Verified', 'Enterprise Ready'],
  },
];

/**
 * Demo Productivity Ready Status Response
 * 
 * Matches the /api/me/productivity-ready endpoint response format.
 */
export const DEMO_PRODUCTIVITY_READY_STATUS = {
  isReady: true,
  idVerified: true,
  vevoVerified: true,
  vevoExpired: false,
  missingRequirements: [],
  productivityReadyAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * Demo Settlement Export Data
 * 
 * Sample data matching the /api/settlements/export endpoint format.
 * Ready for D365/Workday reconciliation.
 */
export const DEMO_SETTLEMENTS_EXPORT = {
  exportedAt: new Date().toISOString(),
  dateRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  },
  count: 3,
  settlements: [
    {
      settlementId: generateDemoSettlementId(-1 * 24 * 60 * 60 * 1000),
      payoutId: 'payout-demo-001',
      shiftId: 'job-003',
      workerId: 'worker-002',
      venueId: 'demo-user-001',
      amountCents: 16800,
      currency: 'aud',
      status: 'completed',
      settlementType: 'immediate',
      stripeChargeId: 'ch_demo_3P4Q5R6S7T8U',
      stripeTransferId: 'tr_demo_A1B2C3D4E5F6',
      processedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      shiftTitle: 'Kitchen Hand',
      hourlyRate: '28.00',
      hoursWorked: '6.00',
    },
    {
      settlementId: generateDemoSettlementId(-3 * 24 * 60 * 60 * 1000),
      payoutId: 'payout-demo-002',
      shiftId: 'shift-prev-001',
      workerId: 'worker-001',
      venueId: 'demo-user-001',
      amountCents: 24500,
      currency: 'aud',
      status: 'completed',
      settlementType: 'immediate',
      stripeChargeId: 'ch_demo_X9Y8Z7W6V5U4',
      stripeTransferId: 'tr_demo_G7H8I9J0K1L2',
      processedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      shiftTitle: 'Bartender - Friday Night',
      hourlyRate: '35.00',
      hoursWorked: '7.00',
    },
    {
      settlementId: generateDemoSettlementId(-5 * 24 * 60 * 60 * 1000),
      payoutId: 'payout-demo-003',
      shiftId: 'shift-prev-002',
      workerId: 'worker-004',
      venueId: 'demo-user-001',
      amountCents: 18000,
      currency: 'aud',
      status: 'completed',
      settlementType: 'immediate',
      stripeChargeId: 'ch_demo_M3N4O5P6Q7R8',
      stripeTransferId: 'tr_demo_S9T0U1V2W3X4',
      processedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      shiftTitle: 'Floor Staff - Weekend',
      hourlyRate: '30.00',
      hoursWorked: '6.00',
    },
  ],
};

// Helper to get demo data with loading simulation (instant for demo)
export function useDemoData<T>(data: T): { data: T; isLoading: false } {
  return { data, isLoading: false };
}
