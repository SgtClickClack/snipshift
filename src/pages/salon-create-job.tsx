import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { EnhancedJobCard } from '@/components/job-feed/enhanced-job-card';
import { JobCardData } from '@/components/job-feed/JobCard';
import { CalendarIcon, X } from 'lucide-react';
import { format, differenceInHours, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';

type JobTitle = 'Barber' | 'Senior Stylist' | 'Colorist' | 'Apprentice';
type JobType = 'Coverage' | 'Busy' | 'Sick';

// Zod validation schema
const jobPostSchema = z.object({
  jobTitle: z.enum(['Barber', 'Senior Stylist', 'Colorist', 'Apprentice'], {
    required_error: 'Job title is required',
  }),
  jobTypes: z.array(z.enum(['Coverage', 'Busy', 'Sick'])).default([]),
  date: z.date({
    required_error: 'Date is required',
  }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  hourlyRate: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Hourly rate must be a positive number' }
  ),
  requirements: z.array(z.string()).default([]),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (!data.startTime || !data.endTime) return true;
    return data.endTime > data.startTime;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

type FormData = z.infer<typeof jobPostSchema>;

const JOB_TITLES: JobTitle[] = ['Barber', 'Senior Stylist', 'Colorist', 'Apprentice'];
const JOB_TYPES: JobType[] = ['Coverage', 'Busy', 'Sick'];
const REQUIREMENTS_OPTIONS = [
  'Must be proficient in fading',
  'Bring own scissors',
  'Experience with color work',
  'Customer service skills',
  'Licensed professional',
  'Weekend availability',
];

export default function SalonCreateJobPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(jobPostSchema),
    defaultValues: {
      jobTitle: undefined,
      jobTypes: [],
      date: undefined,
      startTime: '',
      endTime: '',
      hourlyRate: '',
      requirements: [],
      notes: '',
    },
  });

  const watchedValues = watch();

  // Calculate total hours
  const totalHours = useMemo(() => {
    if (!watchedValues.date || !watchedValues.startTime || !watchedValues.endTime) {
      return 0;
    }

    try {
      const dateStr = format(watchedValues.date, 'yyyy-MM-dd');
      const startDateTime = parseISO(`${dateStr}T${watchedValues.startTime}`);
      const endDateTime = parseISO(`${dateStr}T${watchedValues.endTime}`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return 0;
      }

      const hours = differenceInHours(endDateTime, startDateTime);
      return hours > 0 ? hours : 0;
    } catch {
      return 0;
    }
  }, [watchedValues.date, watchedValues.startTime, watchedValues.endTime]);

  // Calculate estimated total pay
  const estimatedTotalPay = useMemo(() => {
    const rate = parseFloat(watchedValues.hourlyRate);
    if (isNaN(rate) || rate <= 0 || totalHours <= 0) {
      return 0;
    }
    return Math.round(rate * totalHours);
  }, [watchedValues.hourlyRate, totalHours]);

  // Toggle job type
  const toggleJobType = (type: JobType) => {
    const current = watchedValues.jobTypes || [];
    if (current.includes(type)) {
      setValue('jobTypes', current.filter(t => t !== type));
    } else {
      setValue('jobTypes', [...current, type]);
    }
  };

  // Toggle requirement
  const toggleRequirement = (requirement: string) => {
    const current = watchedValues.requirements || [];
    if (current.includes(requirement)) {
      setValue('requirements', current.filter(r => r !== requirement));
    } else {
      setValue('requirements', [...current, requirement]);
    }
  };

  // Build preview job data
  const previewJob: JobCardData = useMemo(() => {
    const dateStr = watchedValues.date
      ? format(watchedValues.date, 'yyyy-MM-dd')
      : undefined;
    const startTimeStr =
      dateStr && watchedValues.startTime
        ? `${dateStr}T${watchedValues.startTime}:00`
        : undefined;
    const endTimeStr =
      dateStr && watchedValues.endTime
        ? `${dateStr}T${watchedValues.endTime}:00`
        : undefined;

    return {
      id: 'preview',
      title: watchedValues.jobTitle || 'Job Title',
      rate: watchedValues.hourlyRate || undefined,
      payRate: watchedValues.hourlyRate || undefined,
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      hours: totalHours > 0 ? totalHours : undefined,
      estimatedTotalPay: estimatedTotalPay > 0 ? estimatedTotalPay : undefined,
      description: watchedValues.notes || undefined,
      location: user?.location || 'Location',
      locationCity: user?.location?.split(',')[0] || undefined,
      status: 'open' as const,
      salonName: user?.displayName || user?.name || 'Your Salon',
      shopName: user?.displayName || user?.name || 'Your Salon',
    };
  }, [watchedValues, totalHours, estimatedTotalPay, user]);

  const onSubmit = async (data: FormData) => {
    // Build the payload
    const dateStr = format(data.date, 'yyyy-MM-dd');
    const startTimeStr = `${dateStr}T${data.startTime}:00`;
    const endTimeStr = `${dateStr}T${data.endTime}:00`;

    const payload = {
      title: data.jobTitle,
      jobTypes: data.jobTypes,
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      hourlyRate: parseFloat(data.hourlyRate),
      requirements: data.requirements,
      notes: data.notes || '',
      totalHours: totalHours,
      estimatedTotalPay: estimatedTotalPay,
    };

    // Payload prepared for submission
  };

  const onSaveDraft = () => {
    // In a real app, this would save as draft
    toast({
      title: 'Draft Saved',
      description: 'Your job post has been saved as a draft.',
    });
  };

  if (!user || (user.currentRole !== 'hub' && user.currentRole !== 'business')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">This page is only available for salon owners.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Create Job Post - Salon Dashboard" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Create Job Post</h1>
          <p className="text-muted-foreground mt-1">Post a new shift for professionals to apply</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Section 1: Role */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Role</h3>

                    {/* Job Title */}
                    <div>
                      <Label htmlFor="jobTitle">Job Title *</Label>
                      <Select
                        value={watchedValues.jobTitle || ''}
                        onValueChange={(value) => setValue('jobTitle', value as JobTitle, { shouldValidate: true })}
                      >
                        <SelectTrigger id="jobTitle" className={errors.jobTitle ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select a job title" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_TITLES.map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.jobTitle && (
                        <p className="text-sm text-destructive mt-1">{errors.jobTitle.message}</p>
                      )}
                    </div>

                    {/* Job Type Tags */}
                    <div>
                      <Label>Job Type</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {JOB_TYPES.map((type) => {
                          const isSelected = watchedValues.jobTypes?.includes(type);
                          return (
                            <Badge
                              key={type}
                              variant={isSelected ? 'default' : 'outline'}
                              className="cursor-pointer px-3 py-1"
                              onClick={() => toggleJobType(type)}
                            >
                              {type}
                              {isSelected && (
                                <X className="h-3 w-3 ml-1" onClick={(e) => {
                                  e.stopPropagation();
                                  toggleJobType(type);
                                }} />
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Schedule */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Schedule</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Date */}
                      <div>
                        <Label>Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              type="button"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !watchedValues.date && 'text-muted-foreground',
                                errors.date && 'border-red-500'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {watchedValues.date ? (
                                format(watchedValues.date, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={watchedValues.date}
                              onSelect={(date) => setValue('date', date, { shouldValidate: true })}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.date && (
                          <p className="text-sm text-destructive mt-1">{errors.date.message}</p>
                        )}
                      </div>

                      {/* Start Time */}
                      <div>
                        <Label htmlFor="startTime">Start Time *</Label>
                        <Input
                          id="startTime"
                          type="time"
                          {...register('startTime')}
                          className={errors.startTime ? 'border-red-500' : ''}
                        />
                        {errors.startTime && (
                          <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>
                        )}
                      </div>

                      {/* End Time */}
                      <div>
                        <Label htmlFor="endTime">End Time *</Label>
                        <Input
                          id="endTime"
                          type="time"
                          {...register('endTime')}
                          className={errors.endTime ? 'border-red-500' : ''}
                        />
                        {errors.endTime && (
                          <p className="text-sm text-destructive mt-1">{errors.endTime.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Total Hours Display */}
                    {totalHours > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">
                          Total Hours: <span className="font-bold">{totalHours}h</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Pay */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Pay</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Hourly Rate */}
                      <div>
                        <Label htmlFor="hourlyRate">Hourly Rate ($) *</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g., 50"
                          {...register('hourlyRate')}
                          className={errors.hourlyRate ? 'border-red-500' : ''}
                        />
                        {errors.hourlyRate && (
                          <p className="text-sm text-destructive mt-1">{errors.hourlyRate.message}</p>
                        )}
                      </div>

                      {/* Estimated Total Pay */}
                      <div>
                        <Label>Total Estimated Pay</Label>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold text-primary">
                            ${estimatedTotalPay.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {watchedValues.hourlyRate && totalHours > 0
                              ? `$${watchedValues.hourlyRate}/hr × ${totalHours}h`
                              : 'Enter rate and hours'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Details</h3>

                    {/* Requirements */}
                    <div>
                      <Label>Requirements</Label>
                      <div className="space-y-2 mt-2">
                        {REQUIREMENTS_OPTIONS.map((requirement) => {
                          const isChecked = watchedValues.requirements?.includes(requirement);
                          return (
                            <div key={requirement} className="flex items-center space-x-2">
                              <Checkbox
                                id={`req-${requirement}`}
                                checked={isChecked}
                                onCheckedChange={() => toggleRequirement(requirement)}
                              />
                              <Label
                                htmlFor={`req-${requirement}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {requirement}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any specific instructions or additional information..."
                        rows={4}
                        {...register('notes')}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSaveDraft}
                      className="flex-1"
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Post Job
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Live Preview */}
          <div className="lg:col-span-1">
            <Card className="hidden lg:block sticky top-4">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This is how your job will appear to professionals
                </p>
              </CardHeader>
              <CardContent>
                <EnhancedJobCard
                  job={previewJob}
                  onViewDetails={() => {}}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

