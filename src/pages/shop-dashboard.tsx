import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Shift } from "@/shared/types";
import { Plus, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function ShopDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    requirements: "",
    pay: "",
  });

  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts/shop", user?.id],
    enabled: !!user?.id,
  });

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      console.log('Submitting shift data:', shiftData);
      const response = await apiRequest("POST", "/api/shifts", {
        title: shiftData.title,
        requirements: shiftData.requirements,
        // Convert datetime-local string to ISO string
        date: new Date(shiftData.date).toISOString(),
        startTime: new Date(shiftData.date).toISOString(), // Provide explicit start time
        // Default end time to 8 hours later if not specified (frontend simplified form)
        endTime: new Date(new Date(shiftData.date).getTime() + 8 * 60 * 60 * 1000).toISOString(),
        // Ensure pay is sent as a number
        hourlyRate: Number(shiftData.pay),
        pay: Number(shiftData.pay), // Keep alias for compatibility
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/shop", user?.id] });
      toast({
        title: "Shift posted successfully",
        description: "Your shift is now live and visible to professionals",
      });
      setFormData({ title: "", date: "", requirements: "", pay: "" });
      setShowForm(false);
    },
    onError: (error) => {
      console.error("Failed to post shift:", error);
      toast({
        title: "Failed to post shift",
        description: "Please check your information and try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.title || !formData.date || !formData.pay) {
      console.error("FORM VALIDATION FAILED: Missing required fields", formData);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createShiftMutation.mutate(formData);
  };

  if (!user || user.currentRole !== "hub") {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Shop Dashboard</h1>
              <p className="text-neutral-600">{user.email}</p>
            </div>
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="bg-primary hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Post New Shift
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
          
          {/* Post Shift Form */}
          {showForm && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Post a New Shift</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div>
                      <Label htmlFor="title">Shift Title</Label>
                      <Input
                        id="title"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Weekend Barber Needed"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="date">Date & Time</Label>
                      <Input
                        id="date"
                        type="datetime-local"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="requirements">Requirements</Label>
                      <Textarea
                        id="requirements"
                        rows={3}
                        value={formData.requirements}
                        onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                        placeholder="Describe the skills and experience needed..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pay">Pay Rate (per hour)</Label>
                      <Input
                        id="pay"
                        type="number"
                        step="0.01"
                        required
                        value={formData.pay}
                        onChange={(e) => setFormData({ ...formData, pay: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createShiftMutation.isPending}
                      onClick={(e) => {
                        // Fail-safe: explicitly call submit handler if form submission doesn't trigger
                        if (e.type === 'click' && (e.target as HTMLButtonElement).type === 'submit') {
                          // Allow default behavior first
                        }
                      }}
                    >
                      {createShiftMutation.isPending ? "Posting..." : "Post Shift"}
                    </Button>
                    
                    {/* DEBUG BUTTON - TO BE REMOVED */}
                    <button
                      type="submit"
                      style={{ backgroundColor: 'red', color: 'white', padding: '10px', fontWeight: 'bold', width: '100%', marginTop: '10px' }}
                      onClick={() => console.log("DEBUG BUTTON CLICKED")}
                    >
                      DEBUG POST
                    </button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Posted Shifts List */}
          <div className={showForm ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card>
              <CardHeader>
                <CardTitle>Your Posted Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div>Loading shifts...</div>
                ) : shifts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-neutral-600">No shifts posted yet.</p>
                    <Button 
                      onClick={() => setShowForm(true)}
                      className="mt-4"
                      variant="outline"
                    >
                      Post Your First Shift
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shifts.map((shift) => (
                      <Card key={shift.id} className="border border-neutral-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-neutral-900">{shift.title}</h4>
                            <span className="bg-success text-white px-3 py-1 rounded-full text-sm font-medium">
                              Active
                            </span>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4 text-sm text-neutral-600 mb-3">
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-primary" />
                              <span>{format(new Date(shift.date), "EEE, MMM d, yyyy - h:mm a")}</span>
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="mr-2 h-4 w-4 text-primary" />
                              <span>${shift.pay}/hour</span>
                            </div>
                          </div>
                          <p className="text-sm text-neutral-600">{shift.requirements}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
