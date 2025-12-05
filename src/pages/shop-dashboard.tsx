import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Shift } from "@/shared/types";
import { Plus, Calendar, DollarSign, CreditCard, Wallet, Loader2, Trash2 } from "lucide-react";
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/shifts/${id}`, { status });
      return res.json();
    },
    onMutate: () => {
      toast({
        title: "Updating Status...",
        description: "Please wait while we update the shift status.",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/shop", user?.id] });
      toast({
        title: "Status Updated",
        description: `Shift status changed to ${data.status === 'completed' ? 'Closed' : data.status}`,
      });
    },
    onError: (error) => {
      // console.error("Failed to update status:", error);
      toast({
        title: "Update Failed",
        description: "Could not update shift status",
        variant: "destructive",
      });
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
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
      // console.error("Failed to post shift:", error);
      toast({
        title: "Failed to post shift",
        description: "Please check your information and try again",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'shift' | 'job' }) => {
      const endpoint = type === 'shift' ? `/api/shifts/${id}` : `/api/jobs/${id}`;
      const res = await apiRequest("DELETE", endpoint);
      // Jobs endpoint returns 204 No Content, shifts returns JSON
      if (res.status === 204) {
        return { success: true };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/shop", user?.id] });
      toast({
        title: "Deleted",
        description: "The item has been removed and all applications have been cancelled.",
      });
    },
    onError: (error) => {
      // console.error("Failed to delete item:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.title || !formData.date || !formData.pay) {
      // console.error("FORM VALIDATION FAILED: Missing required fields", formData);
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
              {showForm ? "Cancel Post" : "Post New Shift"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Section: Stats & Integrations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Stats Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Active Shifts
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{shifts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {shifts.length > 0 ? "Shifts available for pickup" : "No active shifts"}
                </p>
              </CardContent>
            </Card>

            {/* Payments & Payouts Integration */}
            <Card className="border-indigo-100 bg-indigo-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-900">
                  Payments & Payouts
                </CardTitle>
                <Wallet className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-indigo-800 mb-1">
                    Connect Stripe to manage payouts
                  </div>
                  <Button 
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      toast({
                        title: "Redirecting to Stripe Onboarding...",
                        description: "You will be redirected to Stripe to complete your setup.",
                      });
                    }}
                  >
                    Connect with Stripe
                  </Button>
                </div>
                <p className="text-xs text-indigo-600 mt-2">
                  Secure payments powered by Stripe Connect
                </p>
              </CardContent>
            </Card>
        </div>

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
                        if (e.type === 'click' && (e.target as HTMLButtonElement).type === 'submit') {
                           // Handle submit
                        }
                      }}
                    >
                      {createShiftMutation.isPending ? "Posting..." : "Post Shift"}
                    </Button>
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
                    {shifts.map((shift) => {
                      const itemType = (shift as any)._type || 'job';
                      const isShift = itemType === 'shift';
                      // Check ownership: shifts use employerId, jobs use businessId
                      const isOwner = isShift 
                        ? shift.employerId === user?.id
                        : (shift as any).businessId === user?.id;
                      return (
                        <Card key={shift.id} className="border border-neutral-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-semibold text-neutral-900">{shift.title}</h4>
                              <div className="flex items-center gap-2">
                                <div className="w-[130px]">
                                  <Select
                                    defaultValue={shift.status}
                                    disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.id === shift.id}
                                    onValueChange={(value) => updateStatusMutation.mutate({ id: shift.id, status: value })}
                                  >
                                    <SelectTrigger 
                                      className={`h-8 text-xs font-medium border-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                                        shift.status === 'open' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                        shift.status === 'filled' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' :
                                        'bg-red-100 text-red-800 hover:bg-red-200'
                                      }`}
                                    >
                                      {updateStatusMutation.isPending && updateStatusMutation.variables?.id === shift.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                      ) : null}
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="filled">Filled</SelectItem>
                                      <SelectItem value="completed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {isOwner && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        disabled={deleteItemMutation.isPending && deleteItemMutation.variables?.id === shift.id}
                                      >
                                        {deleteItemMutation.isPending && deleteItemMutation.variables?.id === shift.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will remove the {isShift ? 'shift' : 'job'} and cancel all applications. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteItemMutation.mutate({ id: shift.id, type: itemType as 'shift' | 'job' })}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
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
                      );
                    })}
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
