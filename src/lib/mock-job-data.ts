import { JobCardData } from '@/components/job-feed/JobCard';

// Mock salon names and locations
const SALONS = [
  { name: 'Elite Cuts', logo: undefined, city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
  { name: 'Style Studio', logo: undefined, city: 'Brooklyn', state: 'NY', lat: 40.6782, lng: -73.9442 },
  { name: 'Hair Haven', logo: undefined, city: 'Manhattan', state: 'NY', lat: 40.7589, lng: -73.9851 },
  { name: 'The Barber Shop', logo: undefined, city: 'Queens', state: 'NY', lat: 40.7282, lng: -73.7949 },
  { name: 'Color & Cut', logo: undefined, city: 'Bronx', state: 'NY', lat: 40.8448, lng: -73.8648 },
  { name: 'Modern Styles', logo: undefined, city: 'New York', state: 'NY', lat: 40.7505, lng: -73.9934 },
  { name: 'Premium Hair', logo: undefined, city: 'Brooklyn', state: 'NY', lat: 40.6892, lng: -73.9442 },
  { name: 'Classic Cuts', logo: undefined, city: 'Manhattan', state: 'NY', lat: 40.7614, lng: -73.9776 },
];

const JOB_TITLES = [
  'Senior Barber Needed',
  'Hair Stylist - Full Day',
  'Color Specialist Wanted',
  'Barber for Weekend Shifts',
  'Hairdresser - Evening Shift',
  'Stylist - High-End Salon',
  'Barber - Walk-ins Welcome',
  'Colorist - Premium Services',
];

const JOB_TYPES = ['barber', 'hairdresser', 'colorist', 'stylist'] as const;

// Generate a random date within the next 30 days
const getRandomDate = (): Date => {
  const today = new Date();
  const daysAhead = Math.floor(Math.random() * 30);
  const hours = Math.floor(Math.random() * 12) + 8; // 8 AM to 8 PM
  const minutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
  
  const date = new Date(today);
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hours, minutes, 0, 0);
  
  return date;
};

// Generate a random end time (4-8 hours after start)
const getEndTime = (startTime: Date): Date => {
  const endTime = new Date(startTime);
  const hours = 4 + Math.floor(Math.random() * 5); // 4-8 hours
  endTime.setHours(endTime.getHours() + hours);
  return endTime;
};

// Generate random rate between min and max
const getRandomRate = (min: number, max: number): number => {
  return Math.floor((Math.random() * (max - min) + min) / 5) * 5; // Round to nearest 5
};

// Calculate distance from a center point (mock calculation)
const calculateMockDistance = (
  centerLat: number,
  centerLng: number,
  jobLat: number,
  jobLng: number
): number => {
  // Simplified distance calculation (not accurate, just for mock data)
  const latDiff = Math.abs(centerLat - jobLat);
  const lngDiff = Math.abs(centerLng - jobLng);
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough km conversion
};

export interface MockJobData extends JobCardData {
  salonName: string;
  salonLogo?: string;
  distance?: number;
  estimatedTotalPay?: number;
  hours?: number;
  jobType: typeof JOB_TYPES[number];
}

export function generateMockJobs(
  count: number = 10,
  centerLocation?: { lat: number; lng: number }
): MockJobData[] {
  const jobs: MockJobData[] = [];
  const center = centerLocation || { lat: 40.7128, lng: -74.0060 }; // Default to NYC

  for (let i = 0; i < count; i++) {
    const salon = SALONS[Math.floor(Math.random() * SALONS.length)];
    const startTime = getRandomDate();
    const endTime = getEndTime(startTime);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const rate = getRandomRate(30, 80);
    const estimatedTotalPay = Math.round(rate * hours);
    const distance = calculateMockDistance(center.lat, center.lng, salon.lat, salon.lng);
    const jobType = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];

    jobs.push({
      id: `mock-job-${i + 1}`,
      title: JOB_TITLES[Math.floor(Math.random() * JOB_TITLES.length)],
      salonName: salon.name,
      salonLogo: salon.logo,
      rate: rate.toString(),
      payRate: rate.toString(),
      date: startTime.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      description: `Looking for an experienced ${jobType} to join our team. Must have at least 2 years of experience and excellent customer service skills.`,
      location: `${salon.city}, ${salon.state}`,
      locationCity: salon.city,
      locationState: salon.state,
      lat: salon.lat.toString(),
      lng: salon.lng.toString(),
      status: 'open' as const,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      estimatedTotalPay,
      hours: Math.round(hours * 10) / 10, // Round to 1 decimal
      jobType,
      shopName: salon.name,
      businessId: `business-${i + 1}`,
    });
  }

  return jobs;
}

