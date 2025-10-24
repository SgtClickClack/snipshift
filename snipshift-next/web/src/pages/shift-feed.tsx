import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { MapPin, Clock, DollarSign, Users, Filter, Search, Star, Calendar } from 'lucide-react';
import { ShiftCardSkeleton } from '@/components/loading/skeleton-loaders';
import { AccentButton, OutlineButton } from '@/components/ui/standard-button';
import { Button } from '@/components/ui/button';

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
  date: string;
}

import { mockShifts } from '@/lib/mock-data';

export default function ShiftFeedPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [savedShifts, setSavedShifts] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch shifts from the API
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('GET', '/api/jobs');
        const data = await response.json();
        const shifts = data.jobs || [];
        
        // If API returns empty array, fall back to mock data for testing
        if (shifts.length === 0) {
          console.log('No shifts from API, using mock data');
          setShifts(mockShifts);
        } else {
          setShifts(shifts);
        }
      } catch (error) {
        console.error('Error fetching shifts:', error);
        // Fall back to mock data on error
        setShifts(mockShifts);
        toast({
          title: 'Using demo data',
          description: 'Unable to fetch shifts from server. Showing demo data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchShifts();
  }, [toast]);

  // Filter shifts based on search and location
  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = shift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shift.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shift.shopName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !locationFilter || shift.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  const handleApply = async (shift: Shift) => {
    try {
      const response = await apiRequest('POST', '/api/applications', {
        jobId: shift.id,
        coverLetter: coverLetter || 'I am interested in this position.'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit application');
      }
      
      toast({
        title: 'Application submitted',
        description: `Your application for ${shift.title} has been submitted successfully.`,
      });
      
      setShowApplicationModal(false);
      setCoverLetter('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to submit application. Please try again.';
      
      toast({
        title: 'Application failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      console.error('Application submission error:', error);
    }
  };

  const handleSaveShift = (shiftId: string) => {
    const newSavedShifts = savedShifts.includes(shiftId)
      ? savedShifts.filter(id => id !== shiftId)
      : [...savedShifts, shiftId];
    
    setSavedShifts(newSavedShifts);
    localStorage.setItem('savedShifts', JSON.stringify(newSavedShifts));
    
    toast({
      title: savedShifts.includes(shiftId) ? 'Shift unsaved' : 'Shift saved',
      description: savedShifts.includes(shiftId) 
        ? 'Shift removed from your saved list.' 
        : 'Shift added to your saved list.',
    });
  };

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
      <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20" data-testid="shift-feed">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-steel-900 mb-2" data-testid="shift-feed-title">
              Available Shifts
            </h1>
            <p className="text-steel-600">Find your next opportunity</p>
          </div>
          
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <ShiftCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20" data-testid="shift-feed">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-steel-900 mb-2" data-testid="shift-feed-title">
            Available Shifts
          </h1>
          <p className="text-steel-600">
            Find your next opportunity in the creative industry
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 sm:mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-steel-400 h-4 w-4" />
              <Input
                placeholder="Search shifts, shops, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
              <Input
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="sm:w-64"
                data-testid="location-filter"
              />
              <OutlineButton
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-2"
                data-testid="filter-button"
              >
                <Filter className="h-4 w-4" />
                Filters
              </OutlineButton>
            </div>
          </div>

          {showFilters && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-steel-900 mb-3">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-steel-700">Pay Rate</label>
                  <Input placeholder="Min pay rate..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-steel-700">Skills</label>
                  <Input placeholder="Required skills..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-steel-700">Date Range</label>
                  <Input type="date" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-steel-600">
            Showing {filteredShifts.length} of {shifts.length} shifts
          </p>
        </div>

        {/* Shifts Grid */}
        <div className="grid gap-4 sm:gap-6">
          {filteredShifts.map((shift) => (
            <Card key={shift.id} className="hover:shadow-lg transition-shadow" data-testid={`shift-card-${shift.id}`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-steel-100 flex items-center justify-center">
                    <div className="text-steel-400 text-2xl">✂️</div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-semibold text-steel-900 mb-1" data-testid="shift-title">
                          {shift.title}
                        </h3>
                        <p className="text-steel-600 font-medium">{shift.shopName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-steel-600">{shift.shopRating}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveShift(shift.id)}
                          className={savedShifts.includes(shift.id) ? 'text-red-accent' : 'text-steel-400'}
                        >
                          {savedShifts.includes(shift.id) ? '❤️' : '🤍'}
                        </Button>
                      </div>
                    </div>

                    <p className="text-steel-700 mb-4">{shift.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-steel-600 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {shift.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {shift.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${shift.payRate}/hour
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {shift.applicants}/{shift.maxApplicants} applicants
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {shift.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <AccentButton 
                        onClick={() => {
                          setSelectedShift(shift);
                          setShowApplicationModal(true);
                        }}
                        className="w-full"
                        data-testid="apply-button"
                      >
                        Apply Now
                      </AccentButton>
                      <OutlineButton>
                        View Details
                      </OutlineButton>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredShifts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-steel-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-steel-900 mb-2">No shifts found</h3>
            <p className="text-steel-600 mb-4">
              Try adjusting your search criteria or check back later for new opportunities.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setLocationFilter('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-steel-900 mb-4">
              Apply for {selectedShift.title}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-steel-700 mb-2">
                Cover Letter (Optional)
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Tell them why you're perfect for this role..."
                className="w-full p-3 border border-steel-300 rounded-md resize-none h-24"
                data-testid="cover-letter-input"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => handleApply(selectedShift)}
                className="flex-1 bg-gradient-to-r from-red-accent to-red-accent-dark"
                data-testid="submit-application-button"
              >
                Submit Application
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowApplicationModal(false);
                  setCoverLetter('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
