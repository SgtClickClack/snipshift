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
 */

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

// Demo Jobs/Shifts Data
export const DEMO_JOBS = [
  {
    id: 'job-001',
    _type: 'shift',
    title: 'Weekend Bartender',
    description: 'Looking for an experienced bartender for our busy weekend service. Must have RSA certification.',
    status: 'open',
    payRate: 35,
    hourlyRate: 35,
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 26 * 60 * 60 * 1000).toISOString(),
    location: { address: '123 Demo Street', city: 'Sydney', state: 'NSW' },
    skillsRequired: ['Cocktail Making', 'RSA', 'Customer Service'],
    applicationCount: 5,
    applicants: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
    employerId: 'demo-user-001',
    businessId: 'demo-user-001',
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
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000).toISOString(),
    location: { address: '123 Demo Street', city: 'Sydney', state: 'NSW' },
    skillsRequired: ['Customer Service', 'Team Player'],
    applicationCount: 3,
    applicants: [{ id: '1' }, { id: '2' }, { id: '3' }],
    assigneeId: 'worker-001',
    assignedStaff: {
      id: 'worker-001',
      displayName: 'Sarah Johnson',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    },
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
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
    location: { address: '123 Demo Street', city: 'Sydney', state: 'NSW' },
    skillsRequired: ['Food Handling', 'Cleaning'],
    applicationCount: 2,
    applicants: [{ id: '1' }, { id: '2' }],
    assigneeId: 'worker-002',
    employerId: 'demo-user-001',
    businessId: 'demo-user-001',
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
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

// Helper to get demo data with loading simulation (instant for demo)
export function useDemoData<T>(data: T): { data: T; isLoading: false } {
  return { data, isLoading: false };
}
