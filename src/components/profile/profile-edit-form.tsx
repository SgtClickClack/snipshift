import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, Plus, Save, Image as ImageIcon, Camera, Loader2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ProfileHeader from "./profile-header";

interface PortfolioItem {
  id: string;
  imageURL: string;
  caption: string;
  category?: string;
}

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: "professional" | "hub" | "brand" | "trainer";
  bio?: string;
  profileImageURL?: string;
  bannerImageURL?: string;
  location?: {
    city: string;
    state: string;
  };
  portfolio?: PortfolioItem[];
  skills?: string[];
  services?: string[];
  experience?: string;
  businessName?: string;
  businessDescription?: string;
  teamMembers?: Array<{
    name: string;
    role: string;
    imageURL?: string;
  }>;
  operatingHours?: {
    [key: string]: { open: string; close: string };
  };
}

interface ProfileEditFormProps {
  profile: UserProfile;
  onSave: (updatedProfile: UserProfile) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const AUSTRALIAN_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const PORTFOLIO_CATEGORIES = {
  professional: ["Hair Cut", "Color", "Styling", "Beard", "Special Event", "Before/After"],
  hub: ["Interior", "Team", "Equipment", "Events", "Customer Work"],
  brand: ["Products", "Campaign", "Events", "Behind the Scenes"],
  trainer: ["Workshop", "Students", "Techniques", "Events", "Certification"]
};

export default function ProfileEditForm({ profile, onSave, onCancel, isSaving = false }: ProfileEditFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [newSkill, setNewSkill] = useState("");
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    imageURL: "",
    caption: "",
    category: ""
  });
  const [newTeamMember, setNewTeamMember] = useState({
    name: "",
    role: "",
    imageURL: ""
  });

  const updateFormData = (updates: Partial<UserProfile>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Sync bannerUrl when profile.bannerImageURL changes (e.g., after a refetch or upload)
  useEffect(() => {
    if (profile?.bannerImageURL) {
      const extractedBannerUrl = typeof profile.bannerImageURL === 'string' 
        ? profile.bannerImageURL 
        : (profile.bannerImageURL as any)?.bannerUrl || (profile.bannerImageURL as any)?.url || null;
      
      if (extractedBannerUrl && extractedBannerUrl !== formData.bannerImageURL) {
        setFormData(prev => ({ ...prev, bannerImageURL: extractedBannerUrl }));
      }
    }
  }, [profile?.bannerImageURL]);

  // Sync profileImageURL when profile.profileImageURL changes (e.g., after a refetch or upload)
  useEffect(() => {
    if (profile?.profileImageURL) {
      const extractedAvatarUrl = typeof profile.profileImageURL === 'string' 
        ? profile.profileImageURL 
        : (profile.profileImageURL as any)?.avatarUrl || (profile.profileImageURL as any)?.url || null;
      
      if (extractedAvatarUrl && extractedAvatarUrl !== formData.profileImageURL) {
        setFormData(prev => ({ ...prev, profileImageURL: extractedAvatarUrl }));
      }
    }
  }, [profile?.profileImageURL]);


  const addSkillOrService = () => {
    if (!newSkill.trim()) return;
    
    const fieldName = formData.role === 'professional' ? 'skills' : 'services';
    const currentItems = formData[fieldName] || [];
    
    if (!currentItems.includes(newSkill.trim())) {
      updateFormData({
        [fieldName]: [...currentItems, newSkill.trim()]
      });
    }
    setNewSkill("");
  };

  const removeSkillOrService = (item: string) => {
    const fieldName = formData.role === 'professional' ? 'skills' : 'services';
    const currentItems = formData[fieldName] || [];
    
    updateFormData({
      [fieldName]: currentItems.filter(i => i !== item)
    });
  };

  const addPortfolioItem = () => {
    if (!newPortfolioItem.imageURL || !newPortfolioItem.caption) return;
    
    const portfolioItem: PortfolioItem = {
      id: Date.now().toString(),
      ...newPortfolioItem
    };
    
    updateFormData({
      portfolio: [...(formData.portfolio || []), portfolioItem]
    });
    
    setNewPortfolioItem({ imageURL: "", caption: "", category: "" });
  };

  const removePortfolioItem = (id: string) => {
    updateFormData({
      portfolio: formData.portfolio?.filter(item => item.id !== id) || []
    });
  };

  const addTeamMember = () => {
    if (!newTeamMember.name || !newTeamMember.role) return;
    
    updateFormData({
      teamMembers: [...(formData.teamMembers || []), { ...newTeamMember }]
    });
    
    setNewTeamMember({ name: "", role: "", imageURL: "" });
  };

  const removeTeamMember = (index: number) => {
    const updatedTeamMembers = [...(formData.teamMembers || [])];
    updatedTeamMembers.splice(index, 1);
    updateFormData({ teamMembers: updatedTeamMembers });
  };

  const updateOperatingHours = (day: string, field: 'open' | 'close', value: string) => {
    updateFormData({
      operatingHours: {
        ...formData.operatingHours,
        [day]: {
          ...formData.operatingHours?.[day],
          [field]: value
        }
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} data-testid="button-save-profile">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Header with Banner and Avatar */}
        <Card className="overflow-visible">
          <CardContent className="p-0">
            <div className="relative">
              <ProfileHeader
                bannerUrl={formData.bannerImageURL}
                avatarUrl={formData.profileImageURL}
                displayName={formData.displayName}
                editable={true}
                onBannerUpload={(url) => updateFormData({ bannerImageURL: url })}
                onAvatarUpload={(url) => updateFormData({ profileImageURL: url })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Basic Information - with top margin to account for overlapping avatar */}
        <Card className="mt-16 md:mt-20">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => updateFormData({ displayName: e.target.value })}
                  data-testid="input-display-name"
                />
              </div>
              
              {formData.role !== 'professional' && (
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName || ""}
                    onChange={(e) => updateFormData({ businessName: e.target.value })}
                    data-testid="input-business-name"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                value={formData.bio || ""}
                onChange={(e) => updateFormData({ bio: e.target.value })}
                placeholder="Tell others about yourself..."
                data-testid="input-bio"
              />
            </div>

            {formData.role !== 'professional' && (
              <div>
                <Label htmlFor="businessDescription">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  rows={4}
                  value={formData.businessDescription || ""}
                  onChange={(e) => updateFormData({ businessDescription: e.target.value })}
                  placeholder="Describe your business..."
                  data-testid="input-business-description"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.location?.city || ""}
                  onChange={(e) => updateFormData({ 
                    location: { ...formData.location, city: e.target.value, state: formData.location?.state || "" }
                  })}
                  data-testid="input-city"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Select 
                  value={formData.location?.state || ""} 
                  onValueChange={(value) => updateFormData({ 
                    location: { ...formData.location, state: value, city: formData.location?.city || "" }
                  })}
                >
                  <SelectTrigger data-testid="select-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills/Services */}
        <Card>
          <CardHeader>
            <CardTitle>
              {formData.role === 'professional' ? 'Skills' : 'Services'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder={`Add a ${formData.role === 'professional' ? 'skill' : 'service'}...`}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillOrService())}
                data-testid="input-new-skill"
              />
              <Button type="button" onClick={addSkillOrService} data-testid="button-add-skill">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(formData.role === 'professional' ? formData.skills : formData.services)?.map((item, index) => (
                <Badge key={`${item}-${index}`} variant="secondary" className="cursor-pointer" data-testid={`skill-badge-${index}`}>
                  {item}
                  <X 
                    className="w-3 h-3 ml-1" 
                    onClick={() => removeSkillOrService(item)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio/Gallery */}
        <Card>
          <CardHeader>
            <CardTitle>
              {formData.role === 'professional' ? 'Portfolio' : 'Gallery'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Portfolio Item */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Add New Item</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Image URL"
                  value={newPortfolioItem.imageURL}
                  onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, imageURL: e.target.value }))}
                  data-testid="input-portfolio-image-url"
                />
                <Input
                  placeholder="Caption"
                  value={newPortfolioItem.caption}
                  onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, caption: e.target.value }))}
                  data-testid="input-portfolio-caption"
                />
                <div className="flex gap-2">
                  <Select 
                    value={newPortfolioItem.category} 
                    onValueChange={(value) => setNewPortfolioItem(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger data-testid="select-portfolio-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PORTFOLIO_CATEGORIES[formData.role].map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addPortfolioItem} data-testid="button-add-portfolio">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Portfolio Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.portfolio?.map((item) => (
                <div key={item.id} className="border rounded-lg p-3" data-testid={`portfolio-item-${item.id}`}>
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-2">
                    <img
                      src={item.imageURL}
                      alt={item.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{item.caption}</p>
                  {item.category && (
                    <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => removePortfolioItem(item.id)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Members (for Hubs/Brands/Trainers) */}
        {formData.role !== 'professional' && (
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Team Member */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-3">Add Team Member</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input
                    placeholder="Name"
                    value={newTeamMember.name}
                    onChange={(e) => setNewTeamMember(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-team-member-name"
                  />
                  <Input
                    placeholder="Role"
                    value={newTeamMember.role}
                    onChange={(e) => setNewTeamMember(prev => ({ ...prev, role: e.target.value }))}
                    data-testid="input-team-member-role"
                  />
                  <Input
                    placeholder="Image URL (optional)"
                    value={newTeamMember.imageURL}
                    onChange={(e) => setNewTeamMember(prev => ({ ...prev, imageURL: e.target.value }))}
                    data-testid="input-team-member-image"
                  />
                  <Button type="button" onClick={addTeamMember} data-testid="button-add-team-member">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Team Members List */}
              <div className="space-y-3">
                {formData.teamMembers?.map((member, index) => (
                  <div key={`${member.name}-${index}`} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.imageURL} alt={member.name} />
                      <AvatarFallback className="text-sm">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeTeamMember(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operating Hours (for Hubs) */}
        {formData.role === 'hub' && (
          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <Label className="capitalize font-medium">{day}</Label>
                    <Input
                      type="time"
                      value={formData.operatingHours?.[day]?.open || ""}
                      onChange={(e) => updateOperatingHours(day, 'open', e.target.value)}
                      data-testid={`input-${day}-open`}
                    />
                    <Input
                      type="time"
                      value={formData.operatingHours?.[day]?.close || ""}
                      onChange={(e) => updateOperatingHours(day, 'close', e.target.value)}
                      data-testid={`input-${day}-close`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}