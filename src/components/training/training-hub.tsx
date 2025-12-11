import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Clock, BookOpen, Star, Users, ShoppingCart, CreditCard } from "lucide-react";
import { TrainingModule } from "@/shared/types";

interface PaymentModalProps {
  content: TrainingModule | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ content, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!content) return;
    
    setIsProcessing(true);
    
    // Mock Stripe payment - simulate processing time
    // In real integration, this would call backend to create payment intent
    setTimeout(() => {
      toast({
        title: "Payment successful!",
        description: `You now have access to "${content.title}". Enjoy your learning!`,
      });
      setIsProcessing(false);
      onSuccess();
      onClose();
    }, 2000);
  };

  if (!content) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Purchase</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-neutral-900">{content.title}</h3>
            <p className="text-sm text-neutral-600">by {content.trainerName}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-lg font-bold text-primary">${content.price}</span>
              <Badge variant="outline">{content.level}</Badge>
            </div>
          </div>

          {/* Mock Payment Form */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-neutral-700">Card Number</label>
              <div className="mt-1 p-3 border rounded-lg bg-neutral-50 text-neutral-600">
                •••• •••• •••• 4242
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-neutral-700">Expiry</label>
                <div className="mt-1 p-3 border rounded-lg bg-neutral-50 text-neutral-600">
                  12/25
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">CVC</label>
                <div className="mt-1 p-3 border rounded-lg bg-neutral-50 text-neutral-600">
                  123
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Demo Payment:</strong> This is a mock payment system. 
              No real charges will be made.
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1"
              data-testid="button-complete-payment"
            >
              {isProcessing ? (
                <>Processing...</>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${content.price}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TrainingHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContent, setSelectedContent] = useState<TrainingModule | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "free" | "paid" | "beginner" | "advanced">("all");
  
  // Fetch training content
  const { data: content = [], isLoading } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/content", filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === 'beginner' || filter === 'advanced') {
        params.append('level', filter);
      } else if (filter === 'free') {
        params.append('isPaid', 'false');
      } else if (filter === 'paid') {
        params.append('isPaid', 'true');
      }
      
      const response = await fetch(`/api/training/content?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch content");
      }
      return response.json();
    }
  });

  // Fetch user's purchased content
  const { data: purchasedContent = [] } = useQuery<string[]>({
    queryKey: ["/api/training/purchased", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/training/purchased");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const response = await apiRequest("POST", "/api/training/purchase", { contentId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/purchased"] });
    },
  });

  const handlePurchase = (content: TrainingModule) => {
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

  const handlePaymentSuccess = () => {
    if (selectedContent) {
      purchaseMutation.mutate(selectedContent.id);
    }
  };

  const isContentPurchased = (contentId: string) => {
    return purchasedContent.includes(contentId);
  };

  // Client-side filtering fallback if needed, but API handles most
  // We re-filter here for 'all' case to ensure consistency if switching tabs quickly
  const filteredContent = content.filter(item => {
    if (filter === "all") return true;
    if (filter === "free") return !item.isPaid;
    if (filter === "paid") return item.isPaid;
    if (filter === "beginner") return item.level === "beginner";
    if (filter === "advanced") return item.level === "advanced";
    return true;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-red-100 text-red-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Training Hub</h1>
          <p className="text-neutral-600">Learn from industry experts with video courses and tutorials</p>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "free", label: "Free" },
            { key: "paid", label: "Paid" },
            { key: "beginner", label: "Beginner" },
            { key: "advanced", label: "Advanced" },
          ].map((filterOption) => (
            <Button
              key={filterOption.key}
              variant={filter === filterOption.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterOption.key as any)}
              data-testid={`filter-${filterOption.key}`}
            >
              {filterOption.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="text-center py-8" data-testid="text-loading">
          Loading training content...
        </div>
      ) : filteredContent.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600" data-testid="text-no-content">
              No training content found. Check back later for new courses!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item) => (
            <Card key={item.id} className="overflow-visible group" data-testid={`content-${item.id}`}>
              {/* Video Thumbnail */}
              <div className="aspect-video bg-neutral-100 relative overflow-hidden">
                {item.thumbnailUrl ? (
                  <img 
                    src={item.thumbnailUrl} 
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                    <Play className="h-16 w-16 text-neutral-400" />
                  </div>
                )}
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <div className="bg-white dark:bg-steel-900 bg-opacity-90 dark:bg-opacity-90 rounded-full p-3">
                    <Play className="h-8 w-8 text-neutral-800" />
                  </div>
                </div>

                {/* Price Badge */}
                {item.isPaid ? (
                  <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                    ${item.price}
                  </Badge>
                ) : (
                  <Badge className="absolute top-3 right-3 bg-success text-success-foreground">
                    FREE
                  </Badge>
                )}

                {/* Purchased Badge */}
                {isContentPurchased(item.id) && (
                  <Badge className="absolute top-3 left-3 bg-green-600 text-white">
                    Purchased
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg text-neutral-900 line-clamp-2" data-testid={`title-${item.id}`}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-neutral-600" data-testid={`trainer-${item.id}`}>
                      by {item.trainerName || "Anonymous Trainer"}
                    </p>
                  </div>

                  <p className="text-sm text-neutral-700 line-clamp-3" data-testid={`description-${item.id}`}>
                    {item.description}
                  </p>

                  {/* Content Info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-neutral-600">
                        <Clock className="h-4 w-4" />
                        {item.duration}
                      </span>
                      <Badge variant="outline" className={getLevelColor(item.level)}>
                        {item.level}
                      </Badge>
                    </div>
                    <span className="text-neutral-600">{item.category}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-neutral-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {item.purchaseCount} students
                    </span>
                    {item.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {item.rating}
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {isContentPurchased(item.id) ? (
                      <Button 
                        className="w-full" 
                        onClick={() => {
                          // TODO: Implement video player modal/page
                          toast({
                            title: "Opening video",
                            description: `Starting "${item.title}"...`,
                          });
                        }}
                        data-testid={`watch-button-${item.id}`}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Watch Now
                      </Button>
                    ) : item.isPaid ? (
                      <Button 
                        className="w-full"
                        onClick={() => handlePurchase(item)}
                        data-testid={`purchase-button-${item.id}`}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Purchase ${item.price}
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant="outline" 
                        onClick={() => {
                          // TODO: Implement video player modal/page
                          toast({
                            title: "Opening video",
                            description: `Starting "${item.title}"...`,
                          });
                        }}
                        data-testid={`watch-free-button-${item.id}`}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Watch Free
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        content={selectedContent}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
