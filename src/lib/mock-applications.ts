/**
 * Mock applications data for the My Applications page
 * This file provides sample data for development and testing
 */

export type ApplicationStatus = 
  | 'pending' 
  | 'shortlisted' 
  | 'interviewing' 
  | 'rejected' 
  | 'withdrawn' 
  | 'expired';

export interface MockApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  shopName: string;
  shopAvatar?: string;
  jobPayRate: string;
  jobLocation?: string;
  jobDescription?: string;
  jobDate?: string;
  jobStartTime?: string;
  jobEndTime?: string;
  jobHours?: number;
  jobStatus?: 'open' | 'filled' | 'closed' | 'completed';
  status: ApplicationStatus;
  appliedDate: string;
  respondedDate?: string | null;
  businessId?: string;
}

// Mock salon names and avatars
const SALONS = [
  { name: 'Elite Cuts', avatar: undefined },
  { name: 'Style Studio', avatar: undefined },
  { name: 'Hair Haven', avatar: undefined },
  { name: 'The Barber Shop', avatar: undefined },
  { name: 'Color & Cut', avatar: undefined },
  { name: 'Modern Styles', avatar: undefined },
  { name: 'Premium Hair', avatar: undefined },
  { name: 'Classic Cuts', avatar: undefined },
];

const JOB_TITLES = [
  'Senior Barber Position',
  'Hair Stylist - Full Day',
  'Color Specialist Wanted',
  'Barber for Weekend Shifts',
  'Hairdresser - Evening Shift',
  'Stylist - High-End Salon',
  'Barber - Walk-ins Welcome',
  'Colorist - Premium Services',
];

const LOCATIONS = [
  'New York, NY',
  'Brooklyn, NY',
  'Manhattan, NY',
  'Queens, NY',
  'Bronx, NY',
];

// Generate a date N days ago
const getDateDaysAgo = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 4) * 15, 0, 0);
  return date.toISOString();
};

// Generate a future job date
const getFutureJobDate = (daysAhead: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(Math.floor(Math.random() * 12) + 8, 0, 0, 0);
  return date.toISOString();
};

// Generate end time (4-8 hours after start)
const getEndTime = (startTime: string): string => {
  const start = new Date(startTime);
  const hours = 4 + Math.floor(Math.random() * 5);
  start.setHours(start.getHours() + hours);
  return start.toISOString();
};

// Generate random rate
const getRandomRate = (): string => {
  const rate = Math.floor((Math.random() * 50 + 30) / 5) * 5; // $30-$80, rounded to nearest 5
  return `$${rate}/hr`;
};

export function generateMockApplications(): MockApplication[] {
  const applications: MockApplication[] = [
    // Active applications
    {
      id: 'app-1',
      jobId: 'job-1',
      jobTitle: 'Senior Barber Position',
      shopName: 'Elite Cuts',
      shopAvatar: undefined,
      jobPayRate: getRandomRate(),
      jobLocation: 'New York, NY',
      jobDescription: 'Looking for an experienced barber to join our team.',
      jobDate: getFutureJobDate(5),
      jobStartTime: getFutureJobDate(5),
      jobEndTime: getEndTime(getFutureJobDate(5)),
      jobHours: 6,
      jobStatus: 'open',
      status: 'pending',
      appliedDate: getDateDaysAgo(2),
      businessId: 'business-1',
    },
    {
      id: 'app-2',
      jobId: 'job-2',
      jobTitle: 'Hair Stylist - Full Day',
      shopName: 'Style Studio',
      shopAvatar: undefined,
      jobPayRate: getRandomRate(),
      jobLocation: 'Brooklyn, NY',
      jobDescription: 'Full day position for experienced hair stylist.',
      jobDate: getFutureJobDate(10),
      jobStartTime: getFutureJobDate(10),
      jobEndTime: getEndTime(getFutureJobDate(10)),
      jobHours: 8,
      jobStatus: 'open',
      status: 'shortlisted',
      appliedDate: getDateDaysAgo(5),
      respondedDate: getDateDaysAgo(3),
      businessId: 'business-2',
    },
    {
      id: 'app-3',
      jobId: 'job-3',
      jobTitle: 'Color Specialist Wanted',
      shopName: 'Hair Haven',
      shopAvatar: undefined,
      jobPayRate: getRandomRate(),
      jobLocation: 'Manhattan, NY',
      jobDescription: 'Seeking a skilled color specialist.',
      jobDate: getFutureJobDate(14),
      jobStartTime: getFutureJobDate(14),
      jobEndTime: getEndTime(getFutureJobDate(14)),
      jobHours: 7,
      jobStatus: 'open',
      status: 'interviewing',
      appliedDate: getDateDaysAgo(7),
      respondedDate: getDateDaysAgo(4),
      businessId: 'business-3',
    },
    // Past applications
    {
      id: 'app-4',
      jobId: 'job-4',
      jobTitle: 'Barber for Weekend Shifts',
      shopName: 'The Barber Shop',
      shopAvatar: undefined,
      jobPayRate: getRandomRate(),
      jobLocation: 'Queens, NY',
      jobDescription: 'Weekend shifts available for barber.',
      jobDate: getFutureJobDate(-5), // Past date
      jobStartTime: getFutureJobDate(-5),
      jobEndTime: getEndTime(getFutureJobDate(-5)),
      jobHours: 5,
      jobStatus: 'filled',
      status: 'rejected',
      appliedDate: getDateDaysAgo(20),
      respondedDate: getDateDaysAgo(15),
      businessId: 'business-4',
    },
    {
      id: 'app-5',
      jobId: 'job-5',
      jobTitle: 'Hairdresser - Evening Shift',
      shopName: 'Color & Cut',
      shopAvatar: undefined,
      jobPayRate: getRandomRate(),
      jobLocation: 'Bronx, NY',
      jobDescription: 'Evening shift hairdresser position.',
      jobDate: getFutureJobDate(-10),
      jobStartTime: getFutureJobDate(-10),
      jobEndTime: getEndTime(getFutureJobDate(-10)),
      jobHours: 6,
      jobStatus: 'closed',
      status: 'withdrawn',
      appliedDate: getDateDaysAgo(25),
      businessId: 'business-5',
    },
    {
      id: 'app-6',
      jobId: 'job-6',
      jobTitle: 'Stylist - High-End Salon',
      shopName: 'Modern Styles',
      shopAvatar: undefined,
      jobPayRate: getRandomRate(),
      jobLocation: 'New York, NY',
      jobDescription: 'High-end salon seeking experienced stylist.',
      jobDate: getFutureJobDate(-15),
      jobStartTime: getFutureJobDate(-15),
      jobEndTime: getEndTime(getFutureJobDate(-15)),
      jobHours: 8,
      jobStatus: 'closed',
      status: 'expired',
      appliedDate: getDateDaysAgo(30),
      businessId: 'business-6',
    },
  ];

  return applications;
}

// Export function to get applications (for future API integration)
export const getMockApplications = async (): Promise<MockApplication[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return generateMockApplications();
};

