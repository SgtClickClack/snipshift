import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MapPin, Calendar, Star, MessageCircle, Briefcase, Award, Users } from "lucide-react";
import { format } from "date-fns";
import StartChatButton from "@/components/messaging/start-chat-button";

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
  rating?: number;
  reviewCount?: number;
  joinedDate?: string;
  verified?: boolean;
  // Hub/Brand/Trainer specific fields
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

interface PublicProfileProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
  onEditProfile?: () => void;
}

export default function PublicProfile({ profile, isOwnProfile = false, onEditProfile }: PublicProfileProps) {
  const [selectedPortfolioCategory, setSelectedPortfolioCategory] = useState<string | null>(null);
  
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "professional":
        return "Professional";
      case "hub":
        return "Barbershop/Salon";
      case "brand":
        return "Brand";
      case "trainer":
        return "Trainer/Educator";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "professional":
        return "bg-blue-100 text-blue-800";
      case "hub":
        return "bg-green-100 text-green-800";
      case "brand":
        return "bg-purple-100 text-purple-800";
      case "trainer":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const portfolioCategories = profile.portfolio 
    ? Array.from(new Set(profile.portfolio.map(item => item.category).filter((c): c is string => !!c)))
    : [];

  const filteredPortfolio = selectedPortfolioCategory
    ? profile.portfolio?.filter(item => item.category === selectedPortfolioCategory)
    : profile.portfolio;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Section */}
      <div className="relative">
        <div 
          className="h-64 bg-gradient-to-r from-blue-500 to-purple-600 bg-cover bg-center"
          style={profile.bannerImageURL ? { backgroundImage: `url(${profile.bannerImageURL})` } : {}}
          data-testid="profile-banner"
        />
        
        {/* Profile Header */}
        <div className="relative -mt-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                <AvatarImage src={profile.profileImageURL} alt={profile.displayName} />
                <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                  {profile.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2" data-testid="profile-name">
                      {profile.businessName || profile.displayName}
                      {profile.verified && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          <Award className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getRoleColor(profile.role)}>
                        {getRoleDisplay(profile.role)}
                      </Badge>
                      {profile.location && (
                        <div className="flex items-center text-gray-600 text-sm">
                          <MapPin className="w-4 h-4 mr-1" />
                          {profile.location.city}, {profile.location.state}
                        </div>
                      )}
                    </div>
                    {profile.rating && (
                      <div className="flex items-center gap-1 mt-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(profile.rating!) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {profile.rating} ({profile.reviewCount} reviews)
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {!isOwnProfile && (
                      <StartChatButton
                        otherUserId={profile.id}
                        otherUserName={profile.displayName}
                        otherUserRole={profile.role}
                        variant="outline"
                      />
                    )}
                    {isOwnProfile && onEditProfile && (
                      <Button onClick={onEditProfile} data-testid="button-edit-profile">
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4" data-testid="profile-bio">
                  {profile.bio || `${profile.role === 'professional' ? 'Professional' : 'Business'} profile`}
                </p>
                
                {profile.joinedDate && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-2" />
                    Joined {format(new Date(profile.joinedDate), "MMM yyyy")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills/Services */}
            {(profile.skills || profile.services) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {profile.role === 'professional' ? 'Skills' : 'Services'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(profile.skills || profile.services || []).map((item, index) => (
                      <Badge key={index} variant="outline" data-testid={`skill-${index}`}>
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Members (for Hubs/Brands) */}
            {profile.teamMembers && profile.teamMembers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.imageURL} alt={member.name} />
                          <AvatarFallback className="text-sm">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Operating Hours (for Hubs) */}
            {profile.operatingHours && (
              <Card>
                <CardHeader>
                  <CardTitle>Operating Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {Object.entries(profile.operatingHours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="font-medium capitalize">{day}</span>
                        <span className="text-gray-600">
                          {hours.open} - {hours.close}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Description (for non-professionals) */}
            {profile.role !== 'professional' && profile.businessDescription && (
              <Card>
                <CardHeader>
                  <CardTitle>About Our {profile.role === 'hub' ? 'Salon' : 'Business'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{profile.businessDescription}</p>
                </CardContent>
              </Card>
            )}

            {/* Portfolio */}
            {profile.portfolio && profile.portfolio.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {profile.role === 'professional' ? 'Portfolio' : 'Gallery'}
                    </span>
                    {portfolioCategories.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant={selectedPortfolioCategory === null ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPortfolioCategory(null)}
                        >
                          All
                        </Button>
                        {portfolioCategories.map((category) => (
                          <Button
                            key={category}
                            variant={selectedPortfolioCategory === category ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedPortfolioCategory(category)}
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredPortfolio?.map((item, index) => (
                      <div key={item.id} className="group cursor-pointer" data-testid={`portfolio-item-${index}`}>
                        <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                          <img
                            src={item.imageURL}
                            alt={item.caption}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        {item.caption && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.caption}</p>
                        )}
                        {item.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty Portfolio State */}
            {(!profile.portfolio || profile.portfolio.length === 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {profile.role === 'professional' ? 'Portfolio' : 'Gallery'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No {profile.role === 'professional' ? 'portfolio' : 'gallery'} items yet
                    </h3>
                    <p className="text-gray-500">
                      {isOwnProfile 
                        ? `Add images to showcase your ${profile.role === 'professional' ? 'work' : 'business'}`
                        : `This ${profile.role} hasn't added any ${profile.role === 'professional' ? 'portfolio' : 'gallery'} items yet`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}