import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, DollarSign, Users, Filter, Search } from 'lucide-react';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { useSearch, useVirtualScroll } from '@/hooks/usePerformance';

interface Shift {
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
}

const mockShifts: Shift[] = [
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
    maxApplicants: 5
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
    maxApplicants: 10
  }
];

// Memoized Shift Card Component for better performance
const ShiftCard = memo(({ 
  shift, 
  onApply, 
  onViewDetails, 
  onSave, 
  isSaved 
}: {
  shift: Shift;
  onApply: (shift: Shift) => void;
  onViewDetails: (shift: Shift) => void;
  onSave: (shiftId: string) => void;
  isSaved: boolean;
}) => {
  const handleApply = useCallback(() => onApply(shift), [onApply, shift]);
  const handleViewDetails = useCallback(() => onViewDetails(shift), [onViewDetails, shift]);
  const handleSave = useCallback(() => onSave(shift.id), [onSave, shift.id]);

  return (
    <Card className="mb-4 hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{shift.title}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className={isSaved ? 'bg-blue-50 text-blue-600' : ''}
          >
            {isSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-1" />
          {shift.location}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-3">{shift.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-2 text-gray-500" />
            {shift.startTime} - {shift.endTime}
          </div>
          <div className="flex items-center text-sm">
            <DollarSign className="h-4 w-4 mr-2 text-green-500" />
            ${shift.payRate}/hour
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Users className="h-4 w-4 mr-1" />
            {shift.applicants}/{shift.maxApplicants} applicants
          </div>
          <div className="text-sm text-gray-600">
            {shift.shopName} • ⭐ {shift.shopRating}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {shift.skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleApply} className="flex-1">
            Apply Now
          </Button>
          <Button variant="outline" onClick={handleViewDetails}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

ShiftCard.displayName = 'ShiftCard';

export default function ShiftFeedPage() {
  const [locationFilter, setLocationFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [savedShifts, setSavedShifts] = useState<string[]>([]);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const { toast } = useToast();

  // Optimized data fetching with caching
  const { data: shifts = [], isLoading, error } = useOptimizedQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/shifts', {
          credentials: 'include',
          headers: {
            'X-Snipshift-CSRF': '1'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.shifts || mockShifts;
        } else {
          console.warn('Failed to fetch shifts from API, using mock data');
          return mockShifts;
        }
      } catch (error) {
        console.error('Error fetching shifts:', error);
        return mockShifts;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Optimized search functionality
  const { searchTerm, setSearchTerm, filteredItems } = useSearch(
    shifts,
    (shift, term) => 
      shift.title.toLowerCase().includes(term.toLowerCase()) ||
      shift.description.toLowerCase().includes(term.toLowerCase()) ||
      shift.location.toLowerCase().includes(term.toLowerCase()) ||
      shift.shopName.toLowerCase().includes(term.toLowerCase()) ||
      shift.skills.some(skill => skill.toLowerCase().includes(term.toLowerCase())),
    300 // 300ms debounce
  );

  // Apply location filter
  const filteredShifts = useMemo(() => {
    if (!locationFilter) return filteredItems;
    return filteredItems.filter(shift => 
      shift.location.toLowerCase().includes(locationFilter.toLowerCase())
    );
  }, [filteredItems, locationFilter]);

  // Virtual scrolling for large lists
  const ITEM_HEIGHT = 300; // Approximate height of each shift card
  const CONTAINER_HEIGHT = 600; // Height of the visible container
  
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualScroll(filteredShifts, ITEM_HEIGHT, CONTAINER_HEIGHT);

  // Memoized event handlers
  const handleApplyForShift = useCallback((shift: Shift) => {
    setSelectedShift(shift);
    setShowApplicationModal(true);
  }, []);

  const handleViewShiftDetails = useCallback((shift: Shift) => {
    setSelectedShift(shift);
    setShowDetailsModal(true);
  }, []);

  const handleSaveShift = useCallback((shiftId: string) => {
    setSavedShifts(prev => {
      const newSaved = prev.includes(shiftId) 
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId];
      
      // Persist to localStorage
      localStorage.setItem('savedShifts', JSON.stringify(newSaved));
      
      toast({
        title: prev.includes(shiftId) ? 'Shift unsaved' : 'Shift saved',
        description: prev.includes(shiftId) 
          ? 'Shift removed from saved list' 
          : 'Shift added to saved list',
      });
      
      return newSaved;
    });
  }, [toast]);

  // Load saved shifts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedShifts');
    if (saved) {
      try {
        setSavedShifts(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved shifts:', error);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Shifts</h2>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Available Shifts</h1>
        
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search shifts, locations, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <Input
                    placeholder="Filter by location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />
                </div>
                {/* Add more filter options here */}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-gray-600">
          Showing {filteredShifts.length} of {shifts.length} shifts
          {searchTerm && ` for "${searchTerm}"`}
        </p>
      </div>

      {/* Virtual Scrolled Shift List */}
      <div 
        className="overflow-auto"
        style={{ height: CONTAINER_HEIGHT }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                onApply={handleApplyForShift}
                onViewDetails={handleViewShiftDetails}
                onSave={handleSaveShift}
                isSaved={savedShifts.includes(shift.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Apply for {selectedShift.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cover Letter</label>
                  <textarea
                    className="w-full p-3 border rounded-md"
                    rows={4}
                    placeholder="Tell us why you're perfect for this shift..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Portfolio Files</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => setPortfolioFiles(Array.from(e.target.files || []))}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowApplicationModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => setShowConfirmationModal(true)}
                    className="flex-1"
                  >
                    Submit Application
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Application Submitted!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Your application for {selectedShift?.title} has been submitted successfully. 
                You'll be notified when the shop reviews your application.
              </p>
              <Button 
                onClick={() => {
                  setShowConfirmationModal(false);
                  setShowApplicationModal(false);
                  setCoverLetter('');
                  setPortfolioFiles([]);
                }}
                className="w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
