import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Play, DollarSign, Clock, BookOpen, Star, Users, ShoppingCart, CheckCircle, Lock, Filter } from "lucide-react";
import ContentPurchaseModal from "@/components/stripe/content-purchase-modal";

interface TrainingContent {
  id: string;
  trainerId: string;
  trainerName?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  price: number;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  isPaid: boolean;
  purchaseCount: number;
  rating?: number;
}

export default function TrainingHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContent, setSelectedContent] = useState<TrainingContent | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "free" | "paid" | "beginner" | "intermediate" | "advanced">("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: content = [], isLoading } = useQuery<TrainingContent[]>({
    queryKey: ["/api/training-content"],
  });

  // Check content access for purchased items
  const { data: userPurchases = [] } = useQuery({
    queryKey: ["/api/purchases/user", user?.id],
    enabled: !!user?.id,
    select: (data: any) => data.purchases || []
  });

  const handlePurchase = (content: TrainingContent) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to purchase content.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedContent(content);
    setShowPaymentModal(true);
  };

  const handlePurchaseComplete = async (contentId: string, paymentIntentId: string) => {
    try {
      await apiRequest("POST", "/api/purchases/complete", {
        paymentIntentId,
        contentId,
        userId: user?.id
      });

      toast({
        title: "Purchase Complete!",
        description: "Your content is now available. Enjoy your training!",
      });

      // Refresh purchase data
      queryClient.invalidateQueries({ queryKey: ["/api/purchases/user", user?.id] });
    } catch (error) {
      console.error("Error completing purchase:", error);
      toast({
        title: "Purchase Error",
        description: "There was an issue completing your purchase. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const isContentPurchased = (contentId: string) => {
    return userPurchases.some((purchase: any) => 
      purchase.contentId === contentId && purchase.status === 'completed'
    );
  };

  const hasContentAccess = (contentItem: TrainingContent) => {
    return !contentItem.isPaid || isContentPurchased(contentItem.id);
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filter === "all" ||
      (filter === "free" && !item.isPaid) ||
      (filter === "paid" && item.isPaid) ||
      (filter === "beginner" && item.level === "beginner") ||
      (filter === "intermediate" && item.level === "intermediate") ||
      (filter === "advanced" && item.level === "advanced");

    return matchesSearch && matchesFilter;
  });

  const handleAccessContent = (content: TrainingContent) => {
    if (hasContentAccess(content)) {
      // Navigate to content player or open content
      toast({
        title: "Opening Content",
        description: `Starting "${content.title}"`,
      });
      // In a real app, this would navigate to the video player
      console.log("Opening content:", content);
    } else {
      handlePurchase(content);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <span className="ml-3 text-muted-foreground">Loading training content...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="training-hub">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-neutral-900">Training Hub</h2>
        <p className="text-neutral-600">
          Learn from professional barbers and stylists. Master new techniques and grow your skills.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search training content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
            data-testid="input-search"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Content</SelectItem>
              <SelectItem value="free">Free Only</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{content.length}</div>
            <div className="text-sm text-muted-foreground">Total Courses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{content.filter(c => !c.isPaid).length}</div>
            <div className="text-sm text-muted-foreground">Free Courses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{userPurchases.length}</div>
            <div className="text-sm text-muted-foreground">Your Purchases</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">4.8</div>
            <div className="text-sm text-muted-foreground">Avg Rating</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => (
          <Card key={item.id} className="group hover:shadow-lg transition-shadow" data-testid={`content-card-${item.id}`}>
            <div className="relative aspect-video bg-neutral-100 rounded-t-lg overflow-hidden">
              {item.thumbnailUrl ? (
                <img 
                  src={item.thumbnailUrl} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                  <Play className="h-12 w-12 text-neutral-400" />
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-200">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white bg-opacity-90 rounded-full p-3 group-hover:scale-110 transition-transform duration-200">
                    <Play className="h-6 w-6 text-neutral-800" />
                  </div>
                </div>
              </div>

              {/* Price Badge */}
              {item.isPaid && (
                <Badge className="absolute top-3 right-3 bg-green-600 text-white">
                  ${item.price} AUD
                </Badge>
              )}

              {/* Access Badge */}
              {hasContentAccess(item) && (
                <Badge className="absolute top-3 left-3 bg-blue-600 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Owned
                </Badge>
              )}
            </div>

            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg text-neutral-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-neutral-600 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* Trainer Info */}
                <div className="flex items-center text-sm text-neutral-500">
                  <Users className="h-4 w-4 mr-1" />
                  <span>by {item.trainerName || "Professional Trainer"}</span>
                </div>

                {/* Course Details */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-neutral-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {item.duration}
                  </div>
                  <Badge variant="outline">{item.level}</Badge>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-neutral-500">
                  <span>{item.purchaseCount} students</span>
                  {item.rating && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span>{item.rating}</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => handleAccessContent(item)}
                  className={`w-full ${
                    hasContentAccess(item) 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : item.isPaid 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-primary hover:bg-primary/90'
                  }`}
                  data-testid={`button-access-${item.id}`}
                >
                  {hasContentAccess(item) ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Watch Now
                    </>
                  ) : item.isPaid ? (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Purchase ${item.price}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Watch Free
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredContent.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No content found</h3>
          <p className="text-neutral-600 mb-4">
            {searchTerm 
              ? `No training content matches "${searchTerm}"` 
              : "No content available for the selected filter"
            }
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm("");
              setFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Payment Modal */}
      <ContentPurchaseModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedContent(null);
        }}
        content={selectedContent}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
}