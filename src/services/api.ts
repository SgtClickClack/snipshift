import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { auth } from '@/lib/firebase';
import type { User } from '@/contexts/AuthContext';
import type { Job, Shift } from '@shared/firebase-schema';

/**
 * Centralized API Service
 * 
 * Handles all HTTP requests to the backend API with:
 * - Automatic authentication token injection
 * - Global error handling
 * - Type-safe request/response handling
 */

// ============================================================================
// Configuration
// ============================================================================

const getBaseURL = (): string => {
  // In development, Vite proxy handles /api requests
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // In production, use the full API URL from environment variable
  // If VITE_API_URL is provided, use it (should include /api if needed)
  // Otherwise, default to localhost:5000/api
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
};

// ============================================================================
// Axios Instance
// ============================================================================

const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request Interceptor - Authentication
// ============================================================================

api.interceptors.request.use(
  async (config) => {
    // Try to get token from localStorage first (for backend JWT tokens)
    let token: string | null = null;
    
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token') || localStorage.getItem('authToken');
    }

    // Fallback to Firebase token if no localStorage token exists
    if (!token && auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch (error) {
        console.warn('Failed to get Firebase token:', error);
      }
    }

    // Attach token to request if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor - Error Handling
// ============================================================================

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - Clear token and redirect to login
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear tokens from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        
        // Redirect to login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
      }
    }

    // Handle other common errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as any)?.message || error.message;

      switch (status) {
        case 400:
          console.error('Bad Request:', message);
          break;
        case 403:
          console.error('Forbidden:', message);
          break;
        case 404:
          console.error('Not Found:', message);
          break;
        case 500:
          console.error('Server Error:', message);
          break;
        default:
          console.error(`API Error (${status}):`, message);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error: No response from server');
    } else {
      // Something else happened
      console.error('Request Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// Type Definitions
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password?: string;
  name?: string;
  provider?: 'email' | 'google';
  googleId?: string;
  displayName?: string;
  profileImage?: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  name?: string;
  token?: string;
  roles?: string[];
  currentRole?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  profileImage?: string;
  bannerUrl?: string;
}

export interface JobFilterParams {
  city?: string;
  date?: string;
  limit?: number;
  offset?: number;
  search?: string;
  role?: 'barber' | 'hairdresser' | 'stylist' | 'other';
  minRate?: number;
  maxRate?: number;
  startDate?: string;
  endDate?: string;
  radius?: number;
  lat?: number;
  lng?: number;
  status?: 'open' | 'filled' | 'completed';
}

export interface CreateJobData {
  title: string;
  payRate: string | number;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  shopName?: string;
  address?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  sitePhotoUrl?: string;
}

export interface ApplicationData {
  name: string;
  email: string;
  coverLetter: string;
  type?: 'job' | 'shift';
}

export interface DashboardStats {
  role: string;
  summary: {
    activeApplications?: number;
    upcomingBookings?: number;
    unreadMessages?: number;
    averageRating?: number;
    openJobs?: number;
    totalApplications?: number;
    totalHires?: number;
  };
  charts?: Record<string, any>;
}

export interface ProfessionalStats {
  activeApplications: number;
  upcomingBookings: number;
  unreadMessages: number;
  averageRating: number;
}

export interface SalonStats {
  openJobs: number;
  totalApplications: number;
  totalHires: number;
  unreadMessages: number;
}

// ============================================================================
// API Service Methods
// ============================================================================

/**
 * Generic API request helper with type safety
 */
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await api.request<T>(config);
  return response.data;
}

// ============================================================================
// Auth API
// ============================================================================

export const authAPI = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return request<LoginResponse>({
      method: 'POST',
      url: '/login',
      data: credentials,
    });
  },

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<LoginResponse> {
    return request<LoginResponse>({
      method: 'POST',
      url: '/register',
      data,
    });
  },

  /**
   * Logout (clears tokens on client side)
   */
  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
    }
    // Optionally call backend logout endpoint if available
    try {
      await request<void>({
        method: 'POST',
        url: '/logout',
      });
    } catch (error) {
      // Ignore logout errors - tokens are cleared locally
      console.warn('Backend logout failed:', error);
    }
  },
};

// ============================================================================
// Jobs API
// ============================================================================

export const jobsAPI = {
  /**
   * Get all jobs with optional filters
   */
  async getJobs(filters: JobFilterParams = {}): Promise<Job[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await request<Job[] | { data: Job[] }>({
      method: 'GET',
      url: `/jobs?${params.toString()}`,
    });

    // Handle both array response and paginated response
    return Array.isArray(response) ? response : response.data || [];
  },

  /**
   * Get a single job by ID
   */
  async getJobById(id: string): Promise<Job> {
    return request<Job>({
      method: 'GET',
      url: `/jobs/${id}`,
    });
  },

  /**
   * Create a new job posting
   */
  async createJob(data: CreateJobData): Promise<Job> {
    // Map to shift format if needed (backend unification)
    const shiftPayload = {
      title: data.title,
      description: data.description,
      startTime: data.startTime && data.date
        ? (data.startTime.includes('T') 
            ? data.startTime 
            : `${data.date.split('T')[0]}T${data.startTime}:00`)
        : new Date().toISOString(),
      endTime: data.endTime && data.date
        ? (data.endTime.includes('T')
            ? data.endTime
            : `${data.date.split('T')[0]}T${data.endTime}:00`)
        : new Date(Date.now() + 8 * 3600000).toISOString(),
      hourlyRate: data.payRate,
      location: data.location || [data.address, data.city, data.state].filter(Boolean).join(', '),
      status: 'open' as const,
    };

    return request<Job>({
      method: 'POST',
      url: '/shifts',
      data: shiftPayload,
    });
  },

  /**
   * Apply to a job
   */
  async applyToJob(id: string, applicationData: ApplicationData): Promise<any> {
    if (applicationData.type === 'shift') {
      return request({
        method: 'POST',
        url: '/applications',
        data: {
          shiftId: id,
          message: applicationData.coverLetter,
          name: applicationData.name,
          email: applicationData.email,
        },
      });
    }

    return request({
      method: 'POST',
      url: `/jobs/${id}/apply`,
      data: applicationData,
    });
  },

  /**
   * Get shifts (unified job/shift endpoint)
   */
  async getShifts(filters: { status?: 'open' | 'filled' | 'completed'; limit?: number; offset?: number } = {}): Promise<Shift[]> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));

    const response = await request<Shift[] | { data: Shift[] }>({
      method: 'GET',
      url: `/shifts?${params.toString()}`,
    });

    return Array.isArray(response) ? response : response.data || [];
  },
};

// ============================================================================
// Profile API
// ============================================================================

export const profileAPI = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    return request<User>({
      method: 'GET',
      url: '/me',
    });
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    return request<User>({
      method: 'PUT',
      url: '/me',
      data,
    });
  },

  /**
   * Upload profile image
   */
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    return request<{ url: string }>({
      method: 'POST',
      url: '/me/upload-image',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// ============================================================================
// Dashboard API
// ============================================================================

export const dashboardAPI = {
  /**
   * Get professional dashboard statistics
   */
  async getProfessionalStats(): Promise<ProfessionalStats> {
    const stats = await request<DashboardStats>({
      method: 'GET',
      url: '/analytics/dashboard',
    });

    return {
      activeApplications: stats.summary.activeApplications || 0,
      upcomingBookings: stats.summary.upcomingBookings || 0,
      unreadMessages: stats.summary.unreadMessages || 0,
      averageRating: stats.summary.averageRating || 0,
    };
  },

  /**
   * Get salon/hub dashboard statistics
   */
  async getSalonStats(): Promise<SalonStats> {
    const stats = await request<DashboardStats>({
      method: 'GET',
      url: '/analytics/dashboard',
    });

    return {
      openJobs: stats.summary.openJobs || 0,
      totalApplications: stats.summary.totalApplications || 0,
      totalHires: stats.summary.totalHires || 0,
      unreadMessages: stats.summary.unreadMessages || 0,
    };
  },

  /**
   * Get general dashboard statistics (role-agnostic)
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>({
      method: 'GET',
      url: '/analytics/dashboard',
    });
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default api;

