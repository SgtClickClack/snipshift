import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CreditCard, Plus } from "lucide-react";

export default function BillingSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['stripe-customer', user?.id],
    queryFn: async () => {
      // Ensure customer exists
      const res = await apiRequest('POST', '/api/stripe-connect/customer/create');
      return res.json();
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-steel-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing Settings
          </CardTitle>
          <CardDescription>
            Manage your payment methods for shift payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!showAddForm ? (
            <div className="space-y-4">
              <div className="p-4 border border-steel-200 rounded-lg bg-steel-50">
                <p className="text-sm text-steel-700 mb-4">
                  Add a payment method to automatically pay for shifts when barbers accept them.
                </p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="steel-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border border-steel-200 rounded-lg">
                <p className="text-sm text-steel-700 mb-4">
                  Payment method collection will be implemented with Stripe Elements. 
                  For now, payment methods are automatically created when you create your first shift.
                </p>
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-steel-200">
            <h4 className="text-sm font-semibold text-steel-900 mb-2">How it works</h4>
            <ul className="space-y-2 text-sm text-steel-600">
              <li className="flex items-start gap-2">
                <span className="text-steel-400">1.</span>
                <span>Add a payment method (card or bank account)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-steel-400">2.</span>
                <span>When a barber accepts your shift, payment is authorized (funds are held)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-steel-400">3.</span>
                <span>After the shift is completed and reviewed, payment is automatically captured and transferred to the barber</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-steel-400">4.</span>
                <span>You only pay for completed shifts</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
