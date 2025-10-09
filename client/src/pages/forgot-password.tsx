import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Scissors } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Mock password reset - in real app this would call an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      toast({
        title: "Password reset email sent",
        description: "Check your email for reset instructions",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-100 py-12">
        <div className="max-w-md mx-auto px-4">
          <Card className="shadow-sm">
            <CardHeader className="text-center">
              <Scissors className="text-primary text-3xl mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold text-neutral-900">Check Your Email</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-600 text-sm" data-testid="success-message">Password reset email sent</p>
              </div>
              <p className="text-neutral-600 mb-6">
                We've sent password reset instructions to your email address.
              </p>
              <Link to="/login">
                <Button className="w-full">
                  Back to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-12">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <Scissors className="text-primary text-3xl mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-neutral-900">Reset Password</CardTitle>
            <p className="text-neutral-600">Enter your email to receive reset instructions</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="mt-2"
                  data-testid="email-input"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-blue-700"
                disabled={isLoading}
                data-testid="reset-password-button"
              >
                {isLoading ? "Sending..." : "Send Reset Email"}
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <p className="text-neutral-600">
                Remember your password?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
