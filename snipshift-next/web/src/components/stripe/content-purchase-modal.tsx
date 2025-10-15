import { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaymentElement from "./payment-element";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Load Stripe (use test key for demo)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 
  'pk_test_51OqJxYBEZQGWNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
) as any;

interface TrainingContent {
  id: string;
  title: string;
  description: string;
  price: number;
  trainerId: string;
  trainerName?: string;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
}

interface ContentPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: TrainingContent | null;
  onPurchaseComplete: (contentId: string, paymentIntentId: string) => void;
}

export default function ContentPurchaseModal({ 
  isOpen, 
  onClose, 
  content, 
  onPurchaseComplete 
}: ContentPurchaseModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && content && user) {
      createPaymentIntent();
    }
  }, [isOpen, content, user]);

  const createPaymentIntent = async () => {
    if (!content || !user) return;

    try {
      setIsCreatingPayment(true);
      
      // For demo mode, create a mock client secret
      if (process.env.NODE_ENV === 'development') {
        // Simulate payment intent creation delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setClientSecret('pi_test_demo_client_secret_123');
        return;
      }

      const response = await apiRequest('POST', '/api/stripe/create-payment-intent', {
        amount: content.price,
        contentId: content.id,
        trainerId: content.trainerId,
        buyerId: user.id
      });

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast({
        title: "Payment Setup Failed",
        description: "Unable to initialize payment. Please try again.",
        variant: "destructive",
      });
      onClose();
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleSuccess = (paymentIntentId: string) => {
    if (content) {
      onPurchaseComplete(content.id, paymentIntentId);
    }
    onClose();
  };

  const handleClose = () => {
    setClientSecret(null);
    onClose();
  };

  if (!content) return null;

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '6px',
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="content-purchase-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Purchase Training Content
          </DialogTitle>
        </DialogHeader>

        {isCreatingPayment ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-muted-foreground">Setting up secure payment...</span>
          </div>
        ) : clientSecret ? (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance,
              loader: 'auto'
            }}
          >
            <PaymentElement
              contentId={content.id}
              contentTitle={content.title}
              amount={content.price}
              trainerId={content.trainerId}
              trainerName={content.trainerName || 'Professional Trainer'}
              onSuccess={handleSuccess}
              onCancel={handleClose}
            />
          </Elements>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to initialize payment. Please try again.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}