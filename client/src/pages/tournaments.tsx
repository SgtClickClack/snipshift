import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, Trophy, MapPin, Clock } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  prize: string;
  participants: number;
  maxParticipants: number;
  entryFee: number;
  status: 'upcoming' | 'active' | 'completed';
  type: string;
}

const mockTournaments: Tournament[] = [
  {
    id: '1',
    name: 'Sydney Barber Championship 2025',
    description: 'Annual barbering competition showcasing the best talent in Sydney. Compete in various categories including fade techniques, beard styling, and creative cuts.',
    date: '2025-02-15',
    location: 'Sydney Convention Centre',
    prize: '$5,000',
    participants: 25,
    maxParticipants: 50,
    entryFee: 100,
    status: 'upcoming',
    type: 'Skill Competition'
  },
  {
    id: '2',
    name: 'Melbourne Creative Cuts Challenge',
    description: 'Showcase your creativity in this unique competition focused on artistic and innovative haircuts.',
    date: '2025-03-20',
    location: 'Melbourne Arts Centre',
    prize: '$3,000',
    participants: 15,
    maxParticipants: 30,
    entryFee: 75,
    status: 'upcoming',
    type: 'Creative Competition'
  },
  {
    id: '3',
    name: 'Brisbane Speed Cutting Championship',
    description: 'Test your speed and precision in this fast-paced barbering competition.',
    date: '2025-01-30',
    location: 'Brisbane Exhibition Centre',
    prize: '$2,500',
    participants: 40,
    maxParticipants: 40,
    entryFee: 50,
    status: 'upcoming',
    type: 'Speed Competition'
  }
];

export default function TournamentsPage() {
  const [tournaments] = useState<Tournament[]>(mockTournaments);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    whyParticipate: '',
    specialization: '',
    yearsExperience: ''
  });
  const { toast } = useToast();

  const handleRegisterForTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowRegistrationModal(true);
  };

  const handleViewDetails = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowDetailsModal(true);
  };

  const handleSubmitRegistration = () => {
    // Simulate registration submission
    console.log('Registration submitted for:', selectedTournament?.name);
    setShowRegistrationModal(false);
    setRegistrationData({ whyParticipate: '', specialization: '', yearsExperience: '' });
    setSelectedTournament(null);
    
    toast({
      title: "Tournament registration submitted successfully",
      description: "Your registration has been submitted and is under review.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="tournaments-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tournaments</h1>
          <p className="text-gray-600">Compete with other barbers and showcase your skills</p>
        </div>

        {/* Tournament Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="hover:shadow-lg transition-shadow" data-testid="tournament-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg" data-testid="tournament-name">{tournament.name}</CardTitle>
                  <Badge className={getStatusColor(tournament.status)}>
                    {tournament.status}
                  </Badge>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <span data-testid="tournament-type">{tournament.type}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4" data-testid="tournament-description">{tournament.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span data-testid="tournament-date">{tournament.date}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span data-testid="tournament-location">{tournament.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Trophy className="h-4 w-4 mr-2" />
                    <span data-testid="tournament-prize">Prize: {tournament.prize}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span data-testid="tournament-participants">{tournament.participants}/{tournament.maxParticipants} participants</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">Entry Fee: ${tournament.entryFee}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(tournament)}
                    data-testid="button-view-tournament"
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRegisterForTournament(tournament)}
                    data-testid="button-register-tournament"
                  >
                    Register
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tournament Details Modal */}
      {showDetailsModal && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" data-testid="tournament-details">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold" data-testid="tournament-detail-name">{selectedTournament.name}</h2>
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
                <p className="text-gray-700" data-testid="tournament-detail-description">{selectedTournament.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Date</h4>
                  <p data-testid="tournament-detail-date">{selectedTournament.date}</p>
                </div>
                <div>
                  <h4 className="font-medium">Location</h4>
                  <p data-testid="tournament-detail-location">{selectedTournament.location}</p>
                </div>
                <div>
                  <h4 className="font-medium">Prize</h4>
                  <p data-testid="tournament-detail-prize">{selectedTournament.prize}</p>
                </div>
                <div>
                  <h4 className="font-medium">Entry Fee</h4>
                  <p>${selectedTournament.entryFee}</p>
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
                onClick={() => {
                  setShowDetailsModal(false);
                  handleRegisterForTournament(selectedTournament);
                }}
                className="flex-1"
              >
                Register Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistrationModal && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" data-testid="modal-register-tournament">
            <h2 className="text-xl font-bold mb-4">Register for Tournament</h2>
            <div className="mb-4">
              <h3 className="font-semibold" data-testid="registration-tournament-name">{selectedTournament.name}</h3>
              <p className="text-sm text-gray-600">{selectedTournament.location} • {selectedTournament.date}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why do you want to participate?
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md resize-none"
                  rows={3}
                  placeholder="Tell us about your motivation and goals..."
                  value={registrationData.whyParticipate}
                  onChange={(e) => setRegistrationData({ ...registrationData, whyParticipate: e.target.value })}
                  data-testid="textarea-why-participate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-md"
                  placeholder="e.g., Fade Techniques, Beard Styling"
                  value={registrationData.specialization}
                  onChange={(e) => setRegistrationData({ ...registrationData, specialization: e.target.value })}
                  data-testid="input-specialization"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  className="w-full p-3 border border-gray-300 rounded-md"
                  placeholder="5"
                  value={registrationData.yearsExperience}
                  onChange={(e) => setRegistrationData({ ...registrationData, yearsExperience: e.target.value })}
                  data-testid="input-years-experience"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowRegistrationModal(false)}
                className="flex-1"
                data-testid="button-close-modal"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRegistration}
                className="flex-1"
                data-testid="button-submit-registration"
              >
                Submit Registration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
