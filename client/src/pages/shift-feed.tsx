import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  const [shifts] = useState<Shift[]>(mockShifts);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const handleApplyForShift = (shift: Shift) => {
    setSelectedShift(shift);
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = () => {
    // Simulate application submission
    console.log('Application submitted for:', selectedShift?.title);
    setShowApplicationModal(false);
    setCoverLetter('');
    setSelectedShift(null);
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
              onClick={() => setShowFilters(!showFilters)}
              data-testid="filter-location"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Shift Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="shift-results">
          {filteredShifts.map((shift) => (
            <Card key={shift.id} className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="shift-card">
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
                    onClick={() => setSelectedShift(shift)}
                    data-testid="button-view-shift"
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApplyForShift(shift)}
                    data-testid="button-apply-shift"
                  >
                    Apply Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredShifts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No shifts found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
    </div>
  );
}
