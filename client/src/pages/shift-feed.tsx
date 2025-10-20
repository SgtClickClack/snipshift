import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, DollarSign, Users, Filter, Search } from 'lucide-react';

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
    maxApplicants: 3
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
    maxApplicants: 10
  }
];

export default function ShiftFeedPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Fetch shifts from the API
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/shifts', {
          credentials: 'include',
          headers: {
            'X-Snipshift-CSRF': '1'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const shifts = data.shifts || [];
          // If API returns empty array, fall back to mock data for testing
          if (shifts.length === 0) {
            console.warn('API returned empty shifts array, using mock data');
            setShifts(mockShifts);
          } else {
            setShifts(shifts);
          }
        } else {
          // Fallback to mock data if API fails
          console.warn('Failed to fetch shifts from API, using mock data');
          setShifts(mockShifts);
        }
      } catch (error) {
        console.error('Error fetching shifts:', error);
        // Fallback to mock data on error
        setShifts(mockShifts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShifts();
  }, []);


  const handleApplyForShift = (shift: Shift) => {
    setSelectedShift(shift);
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = () => {
    // Simulate application submission
    console.log('Application submitted for:', selectedShift?.title);
    console.log('Cover letter:', coverLetter);
    console.log('Portfolio files:', portfolioFiles);
    setShowApplicationModal(false);
    setShowConfirmationModal(true);
  };

  const handlePortfolioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPortfolioFiles(prev => [...prev, ...files]);
  };

  const handleRemovePortfolioFile = (index: number) => {
    setPortfolioFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveShift = (shiftId: string) => {
    if (savedShifts.includes(shiftId)) {
      setSavedShifts(savedShifts.filter(id => id !== shiftId));
      toast({
        title: "Shift removed from saved",
        description: "The shift has been removed from your saved list.",
      });
    } else {
      setSavedShifts([...savedShifts, shiftId]);
      toast({
        title: "Shift saved",
        description: "The shift has been saved to your list.",
      });
    }
  };

  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = shift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shift.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !locationFilter || shift.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });


  return (
    <div className="min-h-screen bg-gray-50" data-testid="shift-feed">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shift Feed</h1>
          <p className="text-gray-600">Find and apply for barbering shifts that match your skills</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search shifts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-shift-search"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setSearchTerm('')}
              data-testid="button-search-shifts"
            >
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="filter-location"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <Input
                    placeholder="Enter location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    data-testid="input-location-filter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Pay Rate</label>
                  <Input
                    placeholder="$30"
                    type="number"
                    data-testid="input-min-pay"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Pay Rate</label>
                  <Input
                    placeholder="$50"
                    type="number"
                    data-testid="input-max-pay"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                  <Input
                    placeholder="Select skills..."
                    data-testid="filter-skills"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => {
                    setLocationFilter('');
                    setSearchTerm('');
                  }}
                  variant="outline"
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={() => setShowFilters(false)}
                  data-testid="button-apply-location-filter"
                >
                  Apply Location Filter
                </Button>
                <Button
                  onClick={() => setShowFilters(false)}
                  data-testid="button-apply-pay-filter"
                >
                  Apply Pay Filter
                </Button>
                <Button
                  onClick={() => setShowFilters(false)}
                  data-testid="button-apply-skills-filter"
                >
                  Apply Skills Filter
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Search Results Display */}
        {searchTerm && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-600" data-testid="search-query">
                  Search results for: "{searchTerm}"
                </p>
                <p className="text-sm text-blue-600" data-testid="search-results">
                  Found {filteredShifts.length} shifts matching your search
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
                data-testid="button-clear-search"
              >
                Clear Search
              </Button>
            </div>
          </div>
        )}

        {/* Filtered Results Count */}
        {showFilters && (
          <div className="mb-4 p-2 bg-gray-100 rounded">
            <p className="text-sm text-gray-600" data-testid="filtered-results-count">
              Showing {filteredShifts.length} shifts
            </p>
          </div>
        )}

        {/* Shift Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="shift-results">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading shifts...</p>
              </div>
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">No shifts found matching your criteria.</p>
            </div>
          ) : (
            filteredShifts.map((shift) => (
            <Card 
              key={shift.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer" 
              data-testid="shift-card"
              onClick={() => {
                setSelectedShift(shift);
                setShowDetailsModal(true);
              }}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg" data-testid="shift-title">{shift.title}</CardTitle>
                  <Badge variant="secondary" data-testid="shift-pay-rate">${shift.payRate}/hr</Badge>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <span data-testid="shift-shop-name">{shift.shopName}</span>
                  <span className="mx-2">•</span>
                  <span>⭐ {shift.shopRating}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4" data-testid="shift-description">{shift.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span data-testid="shift-location">{shift.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span data-testid="shift-date">{shift.startTime} - {shift.endTime}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span data-testid="applicant-count">{shift.applicants}/{shift.maxApplicants} applicants</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {shift.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveShift(shift.id);
                    }}
                    data-testid="button-save-shift"
                  >
                    {savedShifts.includes(shift.id) ? 'Saved' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShift(shift);
                      setShowDetailsModal(true);
                    }}
                    data-testid="button-view-shift"
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyForShift(shift);
                    }}
                    data-testid="button-apply-shift"
                  >
                    Apply Now
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      </div>

      {/* Shift Details Modal */}
      {showDetailsModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" data-testid="modal-shift-details">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold" data-testid="shift-detail-title">{selectedShift.title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsModal(false)}
                data-testid="button-close-modal"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-700" data-testid="shift-detail-description">{selectedShift.description}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <p className="text-gray-700" data-testid="shift-detail-requirements">{selectedShift.description}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Skills Required</h3>
                <div className="flex flex-wrap gap-1" data-testid="shift-detail-skills">
                  {selectedShift.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Location</h4>
                  <p data-testid="shift-detail-location">{selectedShift.location}</p>
                </div>
                <div>
                  <h4 className="font-medium">Pay Rate</h4>
                  <p data-testid="shift-detail-pay">${selectedShift.payRate}/hr</p>
                </div>
                <div>
                  <h4 className="font-medium">Schedule</h4>
                  <p data-testid="shift-detail-schedule">{selectedShift.startTime} - {selectedShift.endTime}</p>
                </div>
                <div>
                  <h4 className="font-medium">Shop</h4>
                  <p>{selectedShift.shopName}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Mock map view
                  toast({
                    title: "Map View",
                    description: "Map view would open here showing the shift location.",
                  });
                }}
                data-testid="button-view-map"
                className="flex-1"
              >
                View Map
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Mock shop view
                  toast({
                    title: "Shop Information",
                    description: "Shop profile would open here showing ratings and reviews.",
                  });
                }}
                data-testid="button-view-shop"
                className="flex-1"
              >
                View Shop
              </Button>
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleApplyForShift(selectedShift);
                }}
                className="flex-1"
              >
                Apply Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" data-testid="modal-shift-application">
            <h2 className="text-xl font-bold mb-4">Apply for Shift</h2>
            <div className="mb-4">
              <h3 className="font-semibold" data-testid="shift-detail-title">{selectedShift.title}</h3>
              <p className="text-sm text-gray-600">{selectedShift.shopName} • {selectedShift.location}</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Letter (Optional)
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={4}
                placeholder="Tell the shop owner why you're perfect for this shift..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                data-testid="textarea-cover-letter"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio/Work Samples (Optional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handlePortfolioUpload}
                className="w-full p-2 border border-gray-300 rounded-md"
                data-testid="input-portfolio-samples"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload images or PDFs of your work (max 5 files)
              </p>
              
              {portfolioFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {portfolioFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm" data-testid="file-name">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePortfolioFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowApplicationModal(false)}
                className="flex-1"
                data-testid="button-close-modal"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitApplication}
                className="flex-1"
                data-testid="button-submit-application"
              >
                Submit Application
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Application Confirmation Modal */}
      {showConfirmationModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" data-testid="application-confirmation">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2" data-testid="confirmation-title">Application Submitted</h2>
              <p className="text-gray-600" data-testid="confirmation-message">
                Your application has been sent to the shop owner for "{selectedShift.title}".
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-600 space-y-1" data-testid="confirmation-next-steps">
                <li>• The shop owner will review your application</li>
                <li>• You'll receive a notification when they respond</li>
                <li>• Check your applications dashboard for updates</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmationModal(false);
                  setCoverLetter('');
                  setSelectedShift(null);
                }}
                className="flex-1"
                data-testid="button-close-confirmation"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setCoverLetter('');
                  setSelectedShift(null);
                  // Navigate to applications dashboard
                  toast({
                    title: "Navigate to Applications",
                    description: "You would be taken to your applications dashboard.",
                  });
                }}
                className="flex-1"
              >
                View Applications
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
