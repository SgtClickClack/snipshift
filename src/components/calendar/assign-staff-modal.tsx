import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Professional {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  avatar?: string;
  skills?: string[];
  rating?: number;
  lastHired?: string; // ISO date string
}

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (professional: Professional) => void;
  shiftTitle?: string;
  shiftDate?: Date;
}

// Mock data for Recent Hires (as requested)
const MOCK_RECENT_HIRES: Professional[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    displayName: 'Sarah J.',
    email: 'sarah@example.com',
    photoURL: undefined,
    skills: ['Haircutting', 'Coloring', 'Styling'],
    rating: 4.8,
    lastHired: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  },
  {
    id: '2',
    name: 'Michael Chen',
    displayName: 'Michael C.',
    email: 'michael@example.com',
    photoURL: undefined,
    skills: ['Barbering', 'Beard Trim', 'Fade'],
    rating: 4.9,
    lastHired: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
  },
  {
    id: '3',
    name: 'Emma Williams',
    displayName: 'Emma W.',
    email: 'emma@example.com',
    photoURL: undefined,
    skills: ['Hair Styling', 'Extensions', 'Color'],
    rating: 4.7,
    lastHired: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days ago
  },
  {
    id: '4',
    name: 'James Taylor',
    displayName: 'James T.',
    email: 'james@example.com',
    photoURL: undefined,
    skills: ['Barbering', 'Hot Towel Shave'],
    rating: 4.6,
    lastHired: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  },
];

// Mock data for all professionals (for search)
const MOCK_ALL_PROFESSIONALS: Professional[] = [
  ...MOCK_RECENT_HIRES,
  {
    id: '5',
    name: 'Olivia Brown',
    displayName: 'Olivia B.',
    email: 'olivia@example.com',
    skills: ['Haircutting', 'Highlights'],
    rating: 4.5,
  },
  {
    id: '6',
    name: 'David Martinez',
    displayName: 'David M.',
    email: 'david@example.com',
    skills: ['Barbering', 'Fade', 'Line-up'],
    rating: 4.8,
  },
  {
    id: '7',
    name: 'Sophia Anderson',
    displayName: 'Sophia A.',
    email: 'sophia@example.com',
    skills: ['Hair Styling', 'Bridal', 'Updos'],
    rating: 4.9,
  },
];

/**
 * AssignStaffModal Component
 * Modal for assigning staff to a shift (Ghost Slot)
 * Features:
 * - Search bar to find professionals by name or skill
 * - Recent Hires section
 * - Invite to Shift button for each professional
 */
export function AssignStaffModal({
  isOpen,
  onClose,
  onAssign,
  shiftTitle,
  shiftDate,
}: AssignStaffModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter professionals based on search query
  const filteredProfessionals = useMemo(() => {
    if (!searchQuery.trim()) {
      return MOCK_ALL_PROFESSIONALS;
    }

    const query = searchQuery.toLowerCase();
    return MOCK_ALL_PROFESSIONALS.filter((prof) => {
      const nameMatch = prof.name.toLowerCase().includes(query) ||
        prof.displayName?.toLowerCase().includes(query);
      const skillMatch = prof.skills?.some((skill) =>
        skill.toLowerCase().includes(query)
      );
      return nameMatch || skillMatch;
    });
  }, [searchQuery]);

  const handleInvite = (professional: Professional) => {
    onAssign(professional);
    onClose();
    setSearchQuery('');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastHired = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    return `${Math.floor(daysAgo / 30)} months ago`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Staff to Shift</DialogTitle>
          <DialogDescription>
            {shiftTitle && (
              <span className="block mb-1">
                <strong>{shiftTitle}</strong>
              </span>
            )}
            {shiftDate && (
              <span className="text-sm text-muted-foreground">
                {shiftDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Recent Hires Section */}
            {!searchQuery && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Hires
                </h3>
                <div className="space-y-2">
                  {MOCK_RECENT_HIRES.map((professional) => (
                    <div
                      key={professional.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={professional.photoURL || professional.avatar} />
                          <AvatarFallback>
                            {getInitials(professional.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {professional.name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {professional.rating && (
                              <span>⭐ {professional.rating}</span>
                            )}
                            {professional.lastHired && (
                              <span>• {formatLastHired(professional.lastHired)}</span>
                            )}
                          </div>
                          {professional.skills && professional.skills.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {professional.skills.slice(0, 3).map((skill, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleInvite(professional)}
                        size="sm"
                        className="ml-4"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Invite
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results Section */}
            {searchQuery && (
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Search Results ({filteredProfessionals.length})
                </h3>
                {filteredProfessionals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No professionals found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProfessionals.map((professional) => (
                      <div
                        key={professional.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={professional.photoURL || professional.avatar} />
                            <AvatarFallback>
                              {getInitials(professional.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {professional.name}
                            </div>
                            {professional.rating && (
                              <div className="text-sm text-muted-foreground">
                                ⭐ {professional.rating}
                              </div>
                            )}
                            {professional.skills && professional.skills.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {professional.skills.slice(0, 3).map((skill, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleInvite(professional)}
                          size="sm"
                          className="ml-4"
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Invite
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

