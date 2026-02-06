import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CreditCard, Plus } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useSearchParams } from "react-router-dom";
import getStripe from "@/lib/stripe";

// Initialize Stripe
const stripePromise = getStripe();

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
}

function SetupForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/shop-dashboard?tab=billing&success=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred');
        setLoading(false);
      } else {
        toast({
          title: "Success!",
          description: "Payment method added successfully.",
          variant: "default",
        });
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 steel-button"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Payment Method'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function BillingSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Check for success callback
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast({
        title: "Success!",
        description: "Payment method added successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['stripe-payment-methods', user?.id] });
      setShowAddForm(false);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, toast, queryClient, user?.id]);

  // Ensure customer exists
  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['stripe-customer', user?.id],
    queryFn: async () => {
      const res = await apiRequest('POST', '/api/stripe-connect/customer/create');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Fetch payment methods
  const { data: paymentMethodsData, isLoading: isLoadingMethods } = useQuery<{ methods: PaymentMethod[] }>({
    queryKey: ['stripe-payment-methods', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe-connect/payment-methods');
      return res.json();
    },
    enabled: !!user?.id && !!customerData?.customerId,
  });

  // Create setup intent when showing add form
  useEffect(() => {
    if (showAddForm && customerData?.customerId && !clientSecret) {
      apiRequest('POST', '/api/stripe-connect/setup-intent')
        .then(res => res.json())
        .then(data => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          }
        })
        .catch(err => {
          console.error('Error creating setup intent:', err);
          toast({
            title: "Error",
            description: "Failed to initialize payment form. Please try again.",
            variant: "destructive",
          });
          setShowAddForm(false);
        });
    } else if (!showAddForm) {
      setClientSecret(null);
    }
  }, [showAddForm, customerData?.customerId, clientSecret, toast]);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['stripe-payment-methods', user?.id] });
    setShowAddForm(false);
    setClientSecret(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setClientSecret(null);
  };

  if (isLoadingCustomer) {
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

  const paymentMethods = paymentMethodsData?.methods || [];

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
          {/* Existing Payment Methods */}
          {isLoadingMethods ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-steel-600" />
            </div>
          ) : paymentMethods.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-steel-900">Saved Payment Methods</h4>
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border border-steel-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-steel-400" />
                    <div>
                      {method.card && (
                        <>
                          <div className="font-medium capitalize">
                            {method.card.brand} •••• {method.card.last4}
                          </div>
                          <div className="text-sm text-steel-500">
                            Expires {method.card.exp_month}/{method.card.exp_year}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Add Payment Method Form */}
          {showAddForm ? (
            <div className="space-y-4">
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SetupForm onSuccess={handleSuccess} onCancel={handleCancel} />
                </Elements>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-steel-600" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border border-steel-200 rounded-lg bg-steel-50">
                <p className="text-sm text-steel-700 mb-4">
                  Add a payment method to automatically pay for shifts when staff accept them.
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
          )}

          <div className="pt-4 border-t border-steel-200">
            <h4 className="text-sm font-semibold text-steel-900 mb-2">How it works</h4>
            <ul className="space-y-2 text-sm text-steel-600">
              <li className="flex items-start gap-2">
                <span className="text-steel-400">1.</span>
                <span>Add a payment method (card)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-steel-400">2.</span>
                <span>When a professional accepts your shift, payment is authorized (funds are held)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-steel-400">3.</span>
                <span>After the shift is completed and reviewed, payment is automatically captured and transferred to the professional</span>
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
