import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Scissors } from "lucide-react";
import GoogleAuthButton from "@/components/auth/google-auth-button";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Redirect to home for role selection
      // Auth state sync happens via onAuthStateChanged in AuthContext
      navigate("/home");
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Check for user not found or invalid credentials
      // auth/user-not-found is the specific error for non-existent user
      // auth/invalid-credential is the newer generic error which might also be returned
      // auth/invalid-login-credentials is another variant
      const errorCode = error.code;
      const errorMessage = error.message || '';
      
      if (
        errorCode === 'auth/user-not-found' || 
        errorMessage.includes('user-not-found') ||
        errorCode === 'auth/invalid-credential' ||
        errorCode === 'auth/invalid-login-credentials'
      ) {
        toast({
          title: "Account not found or invalid credentials",
          description: "Redirecting to signup if you don't have an account...",
        });
        
        // Redirect to signup with email
        setTimeout(() => {
          navigate(`/signup?email=${encodeURIComponent(formData.email)}`);
        }, 1500);
        return;
      }

      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 py-12">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <Scissors className="text-primary text-3xl mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-neutral-900">Welcome Back</CardTitle>
            <p className="text-neutral-600">Sign in to your account</p>
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="mt-2"
                  data-testid="input-email"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="mt-2"
                  data-testid="input-password"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-blue-700"
                disabled={isLoading}
                data-testid="button-signin"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="my-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-neutral-500">Or continue with</span>
                </div>
              </div>
            </div>

            <GoogleAuthButton mode="signin" />
            
            <div className="text-center mt-6">
              <p className="text-neutral-600">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
