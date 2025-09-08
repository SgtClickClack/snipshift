import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  Receipt, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  CreditCard,
  Banknote,
  DollarSign,
  Calendar,
  User,
  Building2,
  FileText,
  TrendingUp
} from "lucide-react";

const offPlatformPaymentSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  payerName: z.string().min(2, "Payer name must be at least 2 characters"),
  payerType: z.enum(["hub", "professional", "brand", "client"]),
  recipientName: z.string().min(2, "Recipient name must be at least 2 characters"),
  recipientType: z.enum(["hub", "professional", "brand", "client"]),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "bank_transfer", "card", "other"]),
  description: z.string().min(5, "Description must be at least 5 characters"),
  paymentDate: z.string().min(1, "Payment date is required"),
  category: z.enum(["shift_payment", "tip", "product_purchase", "training", "other"]),
  notes: z.string().optional()
});

type OffPlatformPaymentForm = z.infer<typeof offPlatformPaymentSchema>;

interface OffPlatformPayment {
  id: string;
  jobId: string;
  payerName: string;
  payerType: string;
  recipientName: string;
  recipientType: string;
  amount: number;
  paymentMethod: string;
  description: string;
  paymentDate: string;
  category: string;
  notes?: string;
  status: "pending" | "verified" | "disputed";
  submittedBy: string;
  submittedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

interface OffPlatformTrackerProps {
  userId: string;
  userRole: string;
}

export default function OffPlatformTracker({ userId, userRole }: OffPlatformTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const form = useForm<OffPlatformPaymentForm>({
    resolver: zodResolver(offPlatformPaymentSchema),
    defaultValues: {
      paymentMethod: "cash",
      category: "shift_payment",
      paymentDate: new Date().toISOString().split('T')[0]
    }
  });

  const { data: payments = [], isLoading } = useQuery<OffPlatformPayment[]>({
    queryKey: ["/api/payments/off-platform", userId],
  });

  const { data: recentJobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs/recent", userId],
  });

  const { data: paymentStats = { totalAmount: 0, totalCount: 0, verifiedCount: 0, pendingCount: 0 } } = useQuery<{ totalAmount: number; totalCount: number; verifiedCount: number; pendingCount: number }>({
    queryKey: ["/api/payments/off-platform/stats", userId],
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async (data: OffPlatformPaymentForm) => {
      const response = await apiRequest("POST", "/api/payments/off-platform", {
        ...data,
        submittedBy: userId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Recorded",
        description: "Off-platform payment has been logged for transparency.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/off-platform"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/off-platform/stats"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiRequest("POST", `/api/payments/off-platform/${paymentId}/verify`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Verified",
        description: "Payment has been marked as verified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/off-platform"] });
    }
  });

  const onSubmit = (data: OffPlatformPaymentForm) => {
    submitPaymentMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "disputed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-600";
      case "disputed": return "bg-red-600";
      default: return "bg-yellow-600";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="h-4 w-4" />;
      case "card":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === "all") return true;
    if (filter === "verified") return payment.status === "verified";
    if (filter === "pending") return payment.status === "pending";
    if (filter === "disputed") return payment.status === "disputed";
    return payment.category === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <span className="ml-3 text-muted-foreground">Loading payment tracking...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="off-platform-tracker">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Receipt className="h-6 w-6 mr-3 text-blue-600" />
            Off-Platform Payment Tracking
          </h2>
          <p className="text-muted-foreground">
            Log and track payments made outside the platform for transparency and records.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-payment">
              <Plus className="h-4 w-4 mr-2" />
              Log Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Off-Platform Payment</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="jobId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related Job/Shift</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select job..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {recentJobs.map((job: any) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.title} - {job.hubName}
                              </SelectItem>
                            ))}
                            <SelectItem value="other">Other/Not Listed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="shift_payment">Shift Payment</SelectItem>
                            <SelectItem value="tip">Tip/Gratuity</SelectItem>
                            <SelectItem value="product_purchase">Product Purchase</SelectItem>
                            <SelectItem value="training">Training/Education</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Payer Information</Label>
                    <FormField
                      control={form.control}
                      name="payerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Payer name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payerType"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Payer type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hub">Hub/Barbershop</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="brand">Brand</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Recipient Information</Label>
                    <FormField
                      control={form.control}
                      name="recipientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Recipient name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recipientType"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Recipient type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hub">Hub/Barbershop</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="brand">Brand</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            placeholder="0.00" 
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the payment..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional details about this payment..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={submitPaymentMutation.isPending}
                    data-testid="button-submit-payment"
                  >
                    {submitPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {paymentStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">${paymentStats.totalAmount?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Total Tracked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Receipt className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{paymentStats.totalCount || 0}</div>
              <div className="text-sm text-muted-foreground">Total Payments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{paymentStats.verifiedCount || 0}</div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{paymentStats.pendingCount || 0}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          Pending
        </Button>
        <Button
          variant={filter === "verified" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("verified")}
        >
          Verified
        </Button>
        <Button
          variant={filter === "shift_payment" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("shift_payment")}
        >
          Shift Payments
        </Button>
        <Button
          variant={filter === "tip" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("tip")}
        >
          Tips
        </Button>
      </div>

      {/* Payment List */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payments Recorded</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking off-platform payments for transparency and record-keeping.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Payment
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1 text-white">{payment.status}</span>
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {payment.category.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <span className="ml-1 capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium">{payment.description}</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-4">
                          <span>From: {payment.payerName} ({payment.payerType})</span>
                          <span>To: {payment.recipientName} ({payment.recipientType})</span>
                        </div>
                      </div>
                    </div>

                    {payment.notes && (
                      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        <FileText className="h-3 w-3 inline mr-1" />
                        {payment.notes}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </span>
                      <span>Logged by {payment.submittedBy}</span>
                      <span>{new Date(payment.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${payment.amount.toFixed(2)}
                    </div>
                    {payment.status === "pending" && userRole === "admin" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => verifyPaymentMutation.mutate(payment.id)}
                        disabled={verifyPaymentMutation.isPending}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Receipt className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Why track off-platform payments?</strong> This helps maintain transparency, 
          provides accurate business records, and ensures all parties have a record of 
          transactions related to platform connections. All logged payments are for 
          record-keeping purposes only.
        </AlertDescription>
      </Alert>
    </div>
  );
}