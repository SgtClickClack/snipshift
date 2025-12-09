import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, parseISO, differenceInHours } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Calendar, 
  Eye, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Star,
  FileText,
  Upload,
  ArrowRight,
  Briefcase
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useNavigate } from "react-router-dom";
import { Job } from "@shared/firebase-schema";

interface ProfessionalOverviewProps {
  bookings: any[];
  jobs: Job[];
  onViewChange?: (view: string) => void;
}

export default function ProfessionalOverview({ 
  bookings, 
  jobs,
  onViewChange 
}: ProfessionalOverviewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user profile for completeness calculation
  const { data: userProfile } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/me");
      return res.json();
    },
    enabled: !!user,
  });

  // Calculate profile completeness
  const profileCompleteness = useMemo(() => {
    if (!userProfile) return 0;
    
    let completed = 0;
    const total = 10;

    if (userProfile.displayName) completed++;
    if (userProfile.professionalTitle) completed++;
    if (userProfile.bio && userProfile.bio.length > 50) completed++;
    if (userProfile.avatarUrl) completed++;
    if (userProfile.skills && userProfile.skills.length > 0) completed++;
    if (userProfile.certifications && userProfile.certifications.length > 0) completed++;
    if (userProfile.portfolio && userProfile.portfolio.length > 0) completed++;
    if (userProfile.workHistory && userProfile.workHistory.length > 0) completed++;
    if (userProfile.hourlyRateMin && userProfile.hourlyRateMax) completed++;
    if (userProfile.isIdVerified || userProfile.isLicenseVerified) completed++;

    return Math.round((completed / total) * 100);
  }, [userProfile]);

  // Get profile completeness suggestion
  const profileSuggestion = useMemo(() => {
    if (!userProfile) return "Complete your profile to get more opportunities";
    
    if (!userProfile.bio || userProfile.bio.length <= 50) {
      return "Add a bio to reach 100%";
    }
    if (!userProfile.avatarUrl) {
      return "Upload a profile photo";
    }
    if (!userProfile.skills || userProfile.skills.length === 0) {
      return "Add your skills";
    }
    if (!userProfile.isIdVerified && !userProfile.isLicenseVerified) {
      return "Upload ID verification";
    }
    return "Your profile is complete!";
  }, [userProfile]);

  // Calculate upcoming earnings (from confirmed bookings)
  const upcomingEarnings = useMemo(() => {
    if (!bookings || bookings.length === 0) return 0;

    return bookings
      .filter((booking: any) => {
        const status = booking.status;
        return status === "accepted" || status === "confirmed";
      })
      .reduce((total: number, booking: any) => {
        const job = booking.job || booking.shift;
        if (!job) return total;

        const rate = parseFloat(job.payRate || job.hourlyRate || job.pay || "0");
        if (isNaN(rate)) return total;

        let hours = 8; // Default
        if (job.startTime && job.endTime) {
          try {
            const start = parseISO(job.startTime);
            const end = parseISO(job.endTime);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              hours = differenceInHours(end, start);
            }
          } catch {
            // Use default
          }
        }

        return total + (rate * hours);
      }, 0);
  }, [bookings]);

  // Get next shift
  const nextShift = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;

    const confirmedBookings = bookings
      .filter((booking: any) => {
        const status = booking.status;
        return status === "accepted" || status === "confirmed";
      })
      .map((booking: any) => {
        const job = booking.job || booking.shift;
        if (!job) return null;

        const dateStr = job.date || job.startTime;
        if (!dateStr) return null;

        try {
          const date = parseISO(dateStr);
          if (isNaN(date.getTime())) return null;

          return {
            booking,
            job,
            date,
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is { booking: any; job: any; date: Date } => item !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return confirmedBookings.length > 0 ? confirmedBookings[0] : null;
  }, [bookings]);

  // Get next 3 confirmed shifts
  const upcomingShifts = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    return bookings
      .filter((booking: any) => {
        const status = booking.status;
        return status === "accepted" || status === "confirmed";
      })
      .map((booking: any) => {
        const job = booking.job || booking.shift;
        if (!job) return null;

        const dateStr = job.date || job.startTime;
        if (!dateStr) return null;

        try {
          const date = parseISO(dateStr);
          if (isNaN(date.getTime())) return null;

          return {
            booking,
            job,
            date,
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is { booking: any; job: any; date: Date } => item !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);
  }, [bookings]);

  // Get action items
  const actionItems = useMemo(() => {
    const items: Array<{ id: string; title: string; description: string; icon: any; action: () => void; priority: 'high' | 'medium' | 'low' }> = [];

    // Check for shifts that need rating (completed shifts without rating)
    const completedBookings = bookings.filter((booking: any) => {
      const status = booking.status;
      const job = booking.job || booking.shift;
      if (!job) return false;

      const dateStr = job.date || job.startTime;
      if (!dateStr) return false;

      try {
        const date = parseISO(dateStr);
        return status === "completed" && date < new Date();
      } catch {
        return false;
      }
    });

    if (completedBookings.length > 0) {
      items.push({
        id: 'rate-shift',
        title: `Rate your recent shift${completedBookings.length > 1 ? 's' : ''}`,
        description: `You have ${completedBookings.length} completed shift${completedBookings.length > 1 ? 's' : ''} to rate`,
        icon: Star,
        action: () => {
          if (onViewChange) {
            onViewChange('calendar');
          }
        },
        priority: 'medium',
      });
    }

    // Check for ID verification
    if (!userProfile?.isIdVerified && !userProfile?.isLicenseVerified) {
      items.push({
        id: 'upload-id',
        title: 'Upload ID Verification',
        description: 'Verify your identity to unlock more opportunities',
        icon: Upload,
        action: () => {
          if (onViewChange) {
            onViewChange('profile');
          }
        },
        priority: 'high',
      });
    }

    // Check for incomplete profile
    if (profileCompleteness < 100) {
      items.push({
        id: 'complete-profile',
        title: 'Complete your profile',
        description: profileSuggestion,
        icon: FileText,
        action: () => {
          if (onViewChange) {
            onViewChange('profile');
          }
        },
        priority: profileCompleteness < 50 ? 'high' : 'medium',
      });
    }

    return items;
  }, [bookings, userProfile, profileCompleteness, profileSuggestion, onViewChange]);

  // Get recommended jobs (top 3 from available jobs, excluding already applied)
  const recommendedJobs = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];

    const userJobIds = new Set(
      bookings
        .map((booking: any) => booking.jobId || booking.shiftId)
        .filter(Boolean)
    );

    return jobs
      .filter((job) => {
        // Exclude jobs user has already applied to
        if (userJobIds.has(job.id)) return false;
        if (job.applicants?.includes(user?.id || '')) return false;
        
        // Only show open jobs
        return job.status === 'open';
      })
      .slice(0, 3);
  }, [jobs, bookings, user]);

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Get profile views (mock for now, would come from analytics API)
  const profileViews = useMemo(() => {
    // This would come from analytics API in production
    return 12; // Mock value
  }, []);

  const handleQuickApply = (job: Job) => {
    navigate(`/jobs/${job.id}/apply`);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {greeting}, {user?.displayName || user?.email?.split('@')[0] || 'there'}!
                </h2>
                <p className="text-muted-foreground mt-1">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Profile Completeness</span>
                <span className="text-sm font-bold text-foreground">{profileCompleteness}%</span>
              </div>
              <Progress value={profileCompleteness} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {profileSuggestion}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Earnings</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ${upcomingEarnings.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">pending</p>
              </div>
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Next Shift</p>
                {nextShift ? (
                  <>
                    <p className="text-lg font-bold text-foreground mt-1 truncate">
                      {nextShift.job.title || "Untitled Shift"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {isToday(nextShift.date)
                          ? "Today"
                          : isTomorrow(nextShift.date)
                          ? "Tomorrow"
                          : format(nextShift.date, "MMM d")}
                        , {format(nextShift.date, "h:mm a")}
                      </span>
                    </div>
                    {nextShift.job.location && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">
                          {typeof nextShift.job.location === 'string'
                            ? nextShift.job.location
                            : `${nextShift.job.location.city || ''}, ${nextShift.job.location.state || ''}`}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No upcoming shifts</p>
                )}
              </div>
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-3 ml-2">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profile Views</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {profileViews}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Salons viewed your profile this week</p>
              </div>
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/20 p-3">
                <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Up Next */}
          <Card>
            <CardHeader>
              <CardTitle>Up Next</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingShifts.length > 0 ? (
                <div className="space-y-4">
                  {upcomingShifts.map((shift, index) => (
                    <div
                      key={shift.booking.id || index}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {shift.job.title || "Untitled Shift"}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {isToday(shift.date)
                                ? "Today"
                                : isTomorrow(shift.date)
                                ? "Tomorrow"
                                : format(shift.date, "MMM d")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{format(shift.date, "h:mm a")}</span>
                          </div>
                          {shift.job.location && (
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {typeof shift.job.location === 'string'
                                  ? shift.job.location
                                  : `${shift.job.location.city || ''}, ${shift.job.location.state || ''}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        Confirmed
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No upcoming shifts</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => onViewChange?.('jobs')}
                  >
                    Browse Jobs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
            </CardHeader>
            <CardContent>
              {actionItems.length > 0 ? (
                <div className="space-y-3">
                  {actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={item.action}
                    >
                      <div className={`rounded-full p-2 ${
                        item.priority === 'high'
                          ? 'bg-red-100 dark:bg-red-900/20'
                          : item.priority === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20'
                          : 'bg-blue-100 dark:bg-blue-900/20'
                      }`}>
                        <item.icon className={`h-4 w-4 ${
                          item.priority === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : item.priority === 'medium'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground">{item.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-500" />
                  <p>All caught up! No action items.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recommended for You</CardTitle>
            </CardHeader>
            <CardContent>
              {recommendedJobs.length > 0 ? (
                <div className="space-y-4">
                  {recommendedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {job.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                            {job.date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {(() => {
                                    try {
                                      const date = parseISO(job.date);
                                      return isNaN(date.getTime()) ? 'Date TBD' : format(date, "MMM d");
                                    } catch {
                                      return 'Date TBD';
                                    }
                                  })()}
                                </span>
                              </div>
                            )}
                            {job.location && (
                              <div className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {typeof job.location === 'string'
                                    ? job.location
                                    : `${job.location.city || ''}, ${job.location.state || ''}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-lg font-bold text-foreground">
                            ${job.payRate || 'TBD'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            per {job.payType || 'hour'}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleQuickApply(job)}
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        Quick Apply
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onViewChange?.('jobs')}
                  >
                    View All Jobs
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recommended jobs at the moment</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => onViewChange?.('jobs')}
                  >
                    Browse All Jobs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

