import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Edit2, 
  Save, 
  X, 
  CheckCircle2, 
  Award, 
  Star, 
  Clock, 
  MapPin, 
  DollarSign,
  Plus,
  Calendar,
  Briefcase,
  FileText,
  Image as ImageIcon,
  Loader2,
  Camera
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import PortfolioLightbox from './portfolio-lightbox';
import { apiRequest } from '@/lib/queryClient';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '@/lib/firebase';
import { ImageCropper } from '@/components/ui/image-cropper';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useImageUpload } from '@/hooks/useImageUpload';
import { compressImage } from '@/lib/image-compression';

interface PortfolioItem {
  id: string;
  imageURL: string;
  caption?: string;
  category?: string;
}

interface Certification {
  id: string;
  type: string;
  issuer: string;
  date: string;
  status: 'active' | 'expired' | 'pending';
  documentUrl?: string;
}

interface WorkHistoryItem {
  id: string;
  salonName: string;
  position: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

interface Review {
  id: string;
  salonName: string;
  rating: number;
  comment: string;
  date: string;
  reviewerName?: string;
}

interface ProfessionalProfile {
  displayName: string;
  professionalTitle?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  skills: string[];
  certifications: Certification[];
  portfolio: PortfolioItem[];
  workHistory: WorkHistoryItem[];
  reviews: Review[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  availability?: {
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    sunday?: boolean;
  };
  isIdVerified?: boolean;
  isLicenseVerified?: boolean;
  jobSuccessScore?: number;
  totalShiftsCompleted?: number;
  onTimeRate?: number;
}

interface ProfessionalDigitalResumeProps {
  profile?: Partial<ProfessionalProfile>;
  onSave?: (profile: ProfessionalProfile) => void;
}

export default function ProfessionalDigitalResume({ 
  profile: initialProfile,
  onSave 
}: ProfessionalDigitalResumeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isCompressing: isCompressingBanner, handleImageSelect: handleBannerImageSelect } = useImageUpload();
  const { isCompressing: isCompressingAvatar, handleImageSelect: handleAvatarImageSelect } = useImageUpload();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showBannerCropper, setShowBannerCropper] = useState(false);
  const [bannerImageSrc, setBannerImageSrc] = useState<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const identityFileInputRef = useRef<HTMLInputElement>(null);
  const licenseFileInputRef = useRef<HTMLInputElement>(null);

  // Default profile data
  const defaultProfile: ProfessionalProfile = {
    displayName: user?.displayName || '',
    professionalTitle: '',
    avatarUrl: user?.avatarUrl || user?.photoURL || '',
    bannerUrl: '',
    bio: '',
    skills: [],
    certifications: [],
    portfolio: [],
    workHistory: [],
    reviews: [],
    hourlyRateMin: 30,
    hourlyRateMax: 60,
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    isIdVerified: false,
    isLicenseVerified: false,
    jobSuccessScore: undefined,
    totalShiftsCompleted: undefined,
    onTimeRate: undefined,
  };

  const [profile, setProfile] = useState<ProfessionalProfile>({
    ...defaultProfile,
    ...initialProfile,
  });

  const handleIdentityUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfile(prev => ({ ...prev, isIdVerified: true }));
    toast({
      title: 'Identity verified',
      description: 'Identity document uploaded successfully.',
    });

    // Allow re-selecting the same file
    e.target.value = '';
  };

  const handleLicenseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfile(prev => ({ ...prev, isLicenseVerified: true }));
    toast({
      title: 'License verified',
      description: 'License document uploaded successfully.',
    });

    // Allow re-selecting the same file
    e.target.value = '';
  };

  // Calculate profile completeness
  const profileCompleteness = useMemo(() => {
    let completed = 0;
    const total = 10;

    if (profile.displayName) completed++;
    if (profile.professionalTitle) completed++;
    if (profile.bio && profile.bio.length > 50) completed++;
    if (profile.avatarUrl) completed++;
    if (profile.skills.length > 0) completed++;
    if (profile.certifications.length > 0) completed++;
    if (profile.portfolio.length > 0) completed++;
    if (profile.workHistory.length > 0) completed++;
    if (profile.hourlyRateMin && profile.hourlyRateMax) completed++;
    if (profile.isIdVerified || profile.isLicenseVerified) completed++;

    return Math.round((completed / total) * 100);
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // IMPORTANT: Only send URL fields if they contain valid URLs
      // This prevents accidental overwrites when the form has stale/empty values
      const avatarUrl = profile.avatarUrl && profile.avatarUrl.startsWith('http') 
        ? profile.avatarUrl 
        : undefined;
      const bannerUrl = profile.bannerUrl && profile.bannerUrl.startsWith('http') 
        ? profile.bannerUrl 
        : undefined;
      
      // Save to API (exclude URL fields from spread, add them back with validation)
      const { avatarUrl: _avatar, bannerUrl: _banner, ...profileWithoutUrls } = profile;
      await apiRequest('PUT', '/api/me', {
        ...profileWithoutUrls,
        avatarUrl,
        bannerUrl,
        role: 'professional',
      });

      if (onSave) {
        onSave(profile);
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });

      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // Reset input if no file selected
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, GIF, or WebP).",
        variant: "destructive",
      });
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
      return;
    }

    // Create object URL for the cropper immediately (no compression before cropper)
    try {
      const imageUrl = URL.createObjectURL(file);
      setBannerImageSrc(imageUrl);
      setShowBannerCropper(true);
    } catch (error) {
      console.error('Error creating image URL:', error);
      toast({
        title: "Error",
        description: "Failed to load image. Please try again.",
        variant: "destructive",
      });
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
    }
  };

  const handleBannerCropComplete = async (croppedImageBlob: Blob) => {
    setShowBannerCropper(false);
    
    // Clean up the object URL
    if (bannerImageSrc) {
      URL.revokeObjectURL(bannerImageSrc);
      setBannerImageSrc(null);
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload images.",
        variant: "destructive",
      });
      // Reset input
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
      return;
    }

    setIsUploadingBanner(true);

    try {
      // Convert blob to File for compression
      const croppedFile = new File([croppedImageBlob], 'banner.jpg', { type: 'image/jpeg' });
      
      // Compress the cropped image using the hook's compression function
      const compressedFile = await handleBannerImageSelect(croppedFile);
      if (!compressedFile) {
        toast({
          title: "Compression failed",
          description: "Failed to compress image. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const userId = firebaseUser.uid;
      const storagePath = `users/${userId}/banner.jpg`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('Upload timeout'));
        }, 30000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progress > 0) {
              clearTimeout(timeoutId);
            }
          },
          (error: any) => {
            clearTimeout(timeoutId);
            console.error("Banner upload error:", error);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setProfile(prev => ({ ...prev, bannerUrl: downloadURL }));
              toast({
                title: "Banner updated",
                description: "Your banner image has been successfully uploaded.",
              });
              resolve();
            } catch (error) {
              console.error("Error getting banner download URL:", error);
              reject(error);
            }
          }
        );
      });
    } catch (error: any) {
      console.error("Error uploading banner:", error);
      const errorMessage = error.message || "Failed to upload banner image. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Always reset uploading state and input
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
    }
  };

  const handleBannerCropCancel = () => {
    setShowBannerCropper(false);
    if (bannerImageSrc) {
      URL.revokeObjectURL(bannerImageSrc);
      setBannerImageSrc(null);
    }
    // Always reset input on cancel
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = '';
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // Reset input if no file selected
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, GIF, or WebP).",
        variant: "destructive",
      });
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (5MB limit) before processing
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload images.",
        variant: "destructive",
      });
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
      return;
    }

    // Set uploading state immediately
    setIsUploadingAvatar(true);

    try {
      // Compress the image
      const compressedFile = await handleAvatarImageSelect(file);
      if (!compressedFile) {
        toast({
          title: "Compression failed",
          description: "Failed to process image. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const userId = firebaseUser.uid;
      const fileExtension = 'jpg'; // Always use jpg after compression
      const storagePath = `users/${userId}/avatar.${fileExtension}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('Upload timeout'));
        }, 30000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progress > 0) {
              clearTimeout(timeoutId);
            }
          },
          (error: any) => {
            clearTimeout(timeoutId);
            console.error("Avatar upload error:", error);
            reject(error);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setProfile(prev => ({ ...prev, avatarUrl: downloadURL }));
              toast({
                title: "Profile picture updated",
                description: "Your profile picture has been successfully uploaded.",
              });
              resolve();
            } catch (error) {
              console.error("Error getting avatar download URL:", error);
              reject(error);
            }
          }
        );
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      const errorMessage = error.message || "Failed to upload profile picture. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Always reset uploading state and input
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };

  const handleAddPortfolioImage = (url: string) => {
    setProfile(prev => ({
      ...prev,
      portfolio: [
        ...prev.portfolio,
        {
          id: `portfolio-${Date.now()}`,
          imageURL: url,
          caption: '',
        },
      ],
    }));
  };

  const handleRemovePortfolioImage = (id: string) => {
    setProfile(prev => ({
      ...prev,
      portfolio: prev.portfolio.filter(item => item.id !== id),
    }));
  };

  const getAvailabilitySummary = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const availableDays = days.filter(day => profile.availability?.[day as keyof typeof profile.availability]);
    
    if (availableDays.length === 0) return 'Not specified';
    if (availableDays.length === 7) return 'Full availability';
    if (availableDays.length <= 3) {
      return availableDays.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ');
    }
    return `${availableDays.length} days/week`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completeness Bar */}
        {isEditing && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Profile Completeness</Label>
                  <span className="text-sm text-muted-foreground">{profileCompleteness}%</span>
                </div>
                <Progress value={profileCompleteness} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Complete your profile to increase your visibility to salons
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header/Hero Section */}
        <Card className="mb-6 overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-primary/20 to-primary/10">
            {profile.bannerUrl && (
              <OptimizedImage 
                src={profile.bannerUrl} 
                alt="Banner" 
                priority={true}
                fallbackType="banner"
                className="w-full h-full object-cover"
                containerClassName="w-full h-full"
              />
            )}
            {isEditing && (
              <>
                <div className="absolute top-4 right-4">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={isUploadingBanner || isCompressingBanner}
                  >
                    {isUploadingBanner || isCompressingBanner ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isCompressingBanner ? "Compressing..." : "Uploading..."}
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Change Banner
                      </>
                    )}
                  </Button>
                </div>
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleBannerFileSelect}
                  className="hidden"
                  disabled={isUploadingBanner || isCompressingBanner}
                />
                {bannerImageSrc && (
                  <ImageCropper
                    imageSrc={bannerImageSrc}
                    aspectRatio={5 / 1}
                    onCropComplete={handleBannerCropComplete}
                    onCancel={handleBannerCropCancel}
                    open={showBannerCropper}
                  />
                )}
              </>
            )}
          </div>
          <CardContent className="pt-4 pb-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              <div className="relative -mt-20 md:-mt-24">
                <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="absolute bottom-0 right-0 rounded-full"
                      onClick={() => avatarFileInputRef.current?.click()}
                      disabled={isUploadingAvatar || isCompressingAvatar}
                    >
                      {isUploadingAvatar || isCompressingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={isUploadingAvatar || isCompressingAvatar}
                    />
                  </>
                )}
              </div>

              {/* Name, Title, and Info */}
              <div className="flex-1 mt-4 md:mt-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-foreground">
                        {isEditing ? (
                          <Input
                            value={profile.displayName}
                            onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                            className="text-3xl font-bold h-auto p-0 border-0 focus-visible:ring-0"
                            placeholder="[Your Name]"
                          />
                        ) : (
                          profile.displayName || '[Your Name]'
                        )}
                      </h1>
                    </div>
                    {isEditing ? (
                      <Input
                        value={profile.professionalTitle || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, professionalTitle: e.target.value }))}
                        placeholder="Professional Title (e.g., Senior Barber)"
                        className="max-w-md"
                      />
                    ) : (
                      profile.professionalTitle && (
                        <p className="text-xl text-muted-foreground mb-4">{profile.professionalTitle}</p>
                      )
                    )}

                    {/* Verification Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {profile.isIdVerified && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Identity Verified
                        </Badge>
                      )}
                      {profile.isLicenseVerified && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Award className="h-3 w-3 mr-1" />
                          License Verified
                        </Badge>
                      )}
                      {isEditing && (
                        <div className="flex gap-2">
                          <Button
                            variant={profile.isIdVerified ? "default" : "outline"}
                            size="sm"
                          disabled={!!profile.isIdVerified}
                          onClick={() => identityFileInputRef.current?.click()}
                          >
                          {profile.isIdVerified ? 'Identity Verified' : 'Verify Identity'}
                          </Button>
                        <input
                          ref={identityFileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={handleIdentityUpload}
                        />
                          <Button
                            variant={profile.isLicenseVerified ? "default" : "outline"}
                            size="sm"
                          disabled={!!profile.isLicenseVerified}
                          onClick={() => licenseFileInputRef.current?.click()}
                          >
                            {profile.isLicenseVerified ? 'License Verified' : 'Verify License'}
                          </Button>
                        <input
                          ref={licenseFileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={handleLicenseUpload}
                        />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit/Save Button */}
                  <div>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Job Success Score</p>
                      <p className="text-2xl font-bold">
                        {profile.jobSuccessScore != null && profile.jobSuccessScore > 0 
                          ? `${profile.jobSuccessScore}%` 
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shifts Completed</p>
                      <p className="text-2xl font-bold">
                        {profile.totalShiftsCompleted != null && profile.totalShiftsCompleted > 0 
                          ? profile.totalShiftsCompleted 
                          : '0'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">On-Time Rate</p>
                      <p className="text-2xl font-bold">
                        {profile.onTimeRate != null && profile.onTimeRate > 0 
                          ? `${profile.onTimeRate}%` 
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Me */}
            <Card>
              <CardHeader>
                <CardTitle>About Me</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={profile.bio || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell salons about yourself, your experience, and what makes you unique..."
                    rows={6}
                    className="resize-none"
                  />
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {profile.bio || 'No bio added yet. Click "Edit Profile" to add one.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Portfolio Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.portfolio.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {profile.portfolio.map((item, index) => (
                      <div
                        key={item.id}
                        className="group relative aspect-square cursor-pointer rounded-lg overflow-hidden bg-muted"
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <OptimizedImage
                          src={item.imageURL}
                          alt={item.caption || 'Portfolio image'}
                          fallbackType="image"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {isEditing && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePortfolioImage(item.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {item.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                            {item.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 md:py-12 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No portfolio images yet</p>
                    {isEditing && (
                      <Button variant="outline" className="mt-4" onClick={() => {
                        // In a real app, this would open a file picker
                        const url = prompt('Enter image URL:');
                        if (url) handleAddPortfolioImage(url);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Image
                      </Button>
                    )}
                  </div>
                )}
                {isEditing && profile.portfolio.length > 0 && (
                  <Button variant="outline" className="mt-4 w-full" onClick={() => {
                    const url = prompt('Enter image URL:');
                    if (url) handleAddPortfolioImage(url);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Image
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Work History */}
            <Card>
              <CardHeader>
                <CardTitle>Work History</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.workHistory.length > 0 ? (
                  <div className="space-y-4">
                    {profile.workHistory.map((item) => (
                      <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.position}</h4>
                          <p className="text-sm text-muted-foreground">{item.salonName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(item.startDate), 'MMM yyyy')} -{' '}
                            {item.endDate ? format(new Date(item.endDate), 'MMM yyyy') : 'Present'}
                          </p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                          )}
                        </div>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProfile(prev => ({
                              ...prev,
                              workHistory: prev.workHistory.filter(h => h.id !== item.id),
                            }))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No work history added yet</p>
                  </div>
                )}
                {isEditing && (
                  <Button variant="outline" className="mt-4 w-full" onClick={() => {
                    const salonName = prompt('Salon Name:');
                    const position = prompt('Position:');
                    if (salonName && position) {
                      setProfile(prev => ({
                        ...prev,
                        workHistory: [
                          ...prev.workHistory,
                          {
                            id: `work-${Date.now()}`,
                            salonName,
                            position,
                            startDate: new Date().toISOString(),
                          },
                        ],
                      }));
                    }
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Work History
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {profile.reviews.map((review) => (
                      <div key={review.id} className="pb-4 border-b last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{review.salonName}</h4>
                            {review.reviewerName && (
                              <p className="text-sm text-muted-foreground">{review.reviewerName}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reviews yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Skills/Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-sm">
                      {skill}
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Add skill"
                      className="flex-1"
                    />
                    <Button onClick={handleAddSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Certifications */}
            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {profile.certifications.map((cert) => (
                      <div key={cert.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Award className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{cert.type}</p>
                          <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(cert.date), 'MMM yyyy')} â€¢{' '}
                            <Badge
                              variant={
                                cert.status === 'active'
                                  ? 'default'
                                  : cert.status === 'expired'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {cert.status}
                            </Badge>
                          </p>
                        </div>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProfile(prev => ({
                              ...prev,
                              certifications: prev.certifications.filter(c => c.id !== cert.id),
                            }))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No certifications added</p>
                  </div>
                )}
                {isEditing && (
                  <Button variant="outline" className="mt-4 w-full" onClick={() => {
                    const type = prompt('Certification Type (e.g., QLD Barber License):');
                    const issuer = prompt('Issuer:');
                    if (type && issuer) {
                      setProfile(prev => ({
                        ...prev,
                        certifications: [
                          ...prev.certifications,
                          {
                            id: `cert-${Date.now()}`,
                            type,
                            issuer,
                            date: new Date().toISOString(),
                            status: 'active',
                          },
                        ],
                      }));
                    }
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Certification
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Availability */}
            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex items-center justify-between">
                        <Label className="capitalize">{day}</Label>
                        <input
                          type="checkbox"
                          checked={profile.availability?.[day as keyof typeof profile.availability] || false}
                          onChange={(e) => setProfile(prev => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              [day]: e.target.checked,
                            },
                          }))}
                          className="rounded"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{getAvailabilitySummary()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Rates</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Minimum Hourly Rate ($)</Label>
                      <Input
                        type="number"
                        value={profile.hourlyRateMin || ''}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          hourlyRateMin: parseInt(e.target.value) || undefined,
                        }))}
                        placeholder="30"
                      />
                    </div>
                    <div>
                      <Label>Maximum Hourly Rate ($)</Label>
                      <Input
                        type="number"
                        value={profile.hourlyRateMax || ''}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          hourlyRateMax: parseInt(e.target.value) || undefined,
                        }))}
                        placeholder="60"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      ${profile.hourlyRateMin || 'N/A'} - ${profile.hourlyRateMax || 'N/A'}/hr
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Portfolio Lightbox */}
      {selectedImageIndex !== null && (
        <PortfolioLightbox
          images={profile.portfolio}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}
    </div>
  );
}

