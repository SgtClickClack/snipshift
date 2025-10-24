// Centralized mock data for frontend components
// This file consolidates all hardcoded mock data used across components

export interface MockShift {
  id: string;
  title: string;
  description: string;
  location: string;
  payRate: number;
  startTime: string;
  endTime: string;
  skills: string[];
  shopName: string;
  shopRating: number;
  applicants: number;
  maxApplicants: number;
  date: string;
}

export interface MockDashboardShift {
  id: string;
  title: string;
  shop: string;
  location: string;
  date: string;
  time: string;
  pay: string;
  skills: string[];
  description: string;
  shopImage: string;
  applied: boolean;
}

export interface MockFeedPost {
  id: string;
  author: string;
  avatar: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  timestamp: string;
  type: 'promotion' | 'social' | 'job';
}

export interface MockSocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  content: string;
  images?: string[];
  postType: 'social' | 'job';
  likes: number;
  comments: Array<{
    id: string;
    author: string;
    authorId: string;
    text: string;
    timestamp: string;
  }>;
  timestamp: string;
  location?: {
    city: string;
    state: string;
  };
  payRate?: number;
}

// Mock shifts for shift feed
export const mockShifts: MockShift[] = [
  {
    id: '1',
    title: 'Senior Barber - Weekend Shift',
    description: 'Looking for an experienced barber to cover weekend shifts. Must have 3+ years experience with fade techniques.',
    location: 'Sydney, NSW',
    payRate: 35,
    startTime: '09:00',
    endTime: '17:00',
    skills: ['Hair Cutting', 'Fade Techniques', 'Beard Styling'],
    shopName: 'Elite Barbershop',
    shopRating: 4.8,
    applicants: 3,
    maxApplicants: 5,
    date: '2024-01-15'
  },
  {
    id: '2',
    title: 'Mobile Barber Service',
    description: 'Join our mobile barbering team. Travel to client locations and provide premium grooming services.',
    location: 'Melbourne, VIC',
    payRate: 40,
    startTime: '10:00',
    endTime: '18:00',
    skills: ['Mobile Services', 'Customer Service', 'Hair Cutting'],
    shopName: 'Mobile Grooming Co',
    shopRating: 4.9,
    applicants: 1,
    maxApplicants: 3,
    date: '2024-01-20'
  },
  {
    id: '3',
    title: 'Apprentice Opportunity',
    description: 'Great opportunity for a junior barber to learn from experienced professionals in a busy shop.',
    location: 'Brisbane, QLD',
    payRate: 25,
    startTime: '08:00',
    endTime: '16:00',
    skills: ['Learning', 'Basic Cutting', 'Customer Service'],
    shopName: 'Classic Cuts',
    shopRating: 4.5,
    applicants: 8,
    maxApplicants: 10,
    date: '2024-01-18'
  }
];

// Mock shifts for professional dashboard
export const mockDashboardShifts: MockDashboardShift[] = [
  {
    id: '1',
    title: 'Senior Barber Needed',
    shop: 'Modern Cuts Barbershop',
    location: 'Sydney, NSW',
    date: '2024-01-15',
    time: '9:00 AM - 5:00 PM',
    pay: '$35/hour',
    skills: ['Fades', 'Beard Trim', 'Hair Cutting'],
    description: 'Looking for an experienced barber to join our team. Must have 3+ years experience.',
    shopImage: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop',
    applied: false
  },
  {
    id: '2',
    title: 'Weekend Barber',
    shop: 'Classic Barbers',
    location: 'Melbourne, VIC',
    date: '2024-01-20',
    time: '10:00 AM - 4:00 PM',
    pay: '$40/hour',
    skills: ['Hair Cutting', 'Styling', 'Color'],
    description: 'Weekend position available for skilled barber. Great opportunity for extra income.',
    shopImage: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=300&fit=crop',
    applied: true
  }
];

// Mock feed posts for professional dashboard
export const mockFeedPosts: MockFeedPost[] = [
  {
    id: '1',
    author: 'BarberPro Tools',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    content: 'New professional clippers just dropped! Get 20% off with code BARBER20',
    image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&h=300&fit=crop',
    likes: 45,
    comments: 12,
    timestamp: '2 hours ago',
    type: 'promotion'
  },
  {
    id: '2',
    author: 'Hair Academy',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    content: 'Master the art of fade cutting with our new online course. Limited time offer!',
    image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&h=300&fit=crop',
    likes: 78,
    comments: 23,
    timestamp: '5 hours ago',
    type: 'social'
  }
];

// Mock social posts for community feed
export const mockSocialPosts: MockSocialPost[] = [
  {
    id: 'post-1',
    authorId: 'brand-1',
    authorName: 'StyleCraft Studios',
    authorRole: 'brand',
    authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    content: "🚀 Excited to announce our new Premium Styling Tools collection! These ergonomic clippers and trimmers are designed specifically for professional barbers who demand precision and comfort. \n\nWhat makes them special:\n✨ Titanium-coated blades for longer life\n🔋 8-hour battery life\n⚡ Fast charging technology\n🎯 Precision cutting guides\n\nWho's ready to elevate their craft? #BarberTools #StyleCraft #ProfessionalBarber",
    images: [
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop'
    ],
    postType: 'social',
    likes: 47,
    comments: [
      {
        id: 'comment-1',
        author: 'Mike Johnson',
        authorId: 'prof-1',
        text: "These look amazing! How's the weight balance on the clippers?",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comment-2',
        author: "Sarah's Salon",
        authorId: 'hub-1',
        text: "We've been using StyleCraft tools for 3 years - they're incredibly reliable!",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ],
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job-post-1',
    authorId: 'hub-2',
    authorName: 'Elite Barbershop Sydney',
    authorRole: 'hub',
    authorAvatar: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=150&h=150&fit=crop&crop=face',
    content: "We're looking for an experienced barber to join our team in Sydney CBD! Perfect opportunity for someone passionate about classic cuts and modern styles.\n\nWe offer:\n• Competitive hourly rate + tips\n• Flexible schedule options\n• Professional development opportunities\n• Prime location with high foot traffic",
    postType: 'job',
    location: {
      city: 'Sydney',
      state: 'NSW'
    },
    payRate: 35,
    likes: 23,
    comments: [
      {
        id: 'comment-3',
        author: 'Alex Chen',
        authorId: 'prof-2',
        text: "What's the typical client volume like?",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      }
    ],
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

// Mock skill options for onboarding
export const mockSkillOptions = [
  'Hair Cutting',
  'Fade Techniques',
  'Beard Styling',
  'Mustache Styling',
  'Hot Towel Shaves',
  'Hair Coloring',
  'Hair Styling',
  'Customer Service',
  'Mobile Services',
  'Traditional Techniques',
  'Modern Techniques',
  'Competition Styling'
];

// Mock travel options for onboarding
export const mockTravelOptions = [
  'Local (within 10km)',
  'Regional (within 50km)',
  'Metropolitan (within 100km)',
  'Interstate',
  'Remote locations'
];

// Mock availability options for onboarding
export const mockAvailabilityOptions = [
  'Weekdays only',
  'Weekends only',
  'Evenings',
  'Early mornings',
  'Flexible',
  'Full-time',
  'Part-time',
  'Casual'
];
