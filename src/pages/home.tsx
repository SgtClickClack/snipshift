import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Store, UserCheck, Award, GraduationCap, FastForward } from "lucide-react";
import { authService } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/queryClient";

export default function HomePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const user = authService.getCurrentUser();

  // Force all users to stay on home page for role selection
  useEffect(() => {
    if (!user) {
      // No user logged in, redirect to landing page
      navigate('/');
      return;
    }
    // All authenticated users can access this page regardless of role
  }, [user, navigate]);

  const handleRoleSelection = async (role: "hub" | "professional" | "brand" | "trainer") => {
    setIsLoading(true);
    
    try {
      // Update user role via API (this adds the role to their account)
      await apiRequest("POST", `/api/users/role`, { role });
      
      // Update local auth state
      const updatedUser = { ...user!, role };
      authService.login(updatedUser);
      
      toast({
        title: "Role added!",
        description: `${role} role added to your account. Taking you to your ${role} dashboard.`,
      });

      // Redirect to dashboard for this role
      const dashboardMap = {
        hub: '/hub-dashboard',
        professional: '/professional-dashboard',
        brand: '/brand-dashboard',
        trainer: '/trainer-dashboard'
      };
      
      const targetDashboard = dashboardMap[role];
      setTimeout(() => navigate(targetDashboard), 100); // Small delay to ensure state update
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only render for authenticated users
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-steel-50 to-white">
      {/* Role Selection Hero */}
      <div className="py-8 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full shadow-xl">
              <FastForward className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-steel-900 mb-6">
            Welcome to HospoGo!
          </h1>
          <p className="text-xl text-steel-600 mb-8 max-w-2xl mx-auto">
            Choose a role to access that dashboard. You can have multiple roles on your account.
          </p>
          
          {/* Force Reset Button */}
          {import.meta.env.DEV && (
            <div className="text-center mb-8">
              <button 
                onClick={() => {
                  // Force complete reset
                  localStorage.clear();
                  sessionStorage.clear();
                  // Clear all cookies
                  document.cookie.split(";").forEach(c => {
                    const eqPos = c.indexOf("=");
                    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                  });
                  window.location.href = '/';
                }}
                className="text-xs opacity-50 hover:opacity-100 bg-red-500 text-white px-4 py-2 rounded font-bold"
              >
                FORCE RESET - Test New User Flow
              </button>
            </div>
          )}

          {/* Role Selection Grid */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card 
              className="p-6 bg-card shadow-xl border-2 border-border hover:shadow-2xl hover:border-blue-400/50 transition-all duration-300 cursor-pointer group"
              onClick={() => handleRoleSelection('hub')}
            >
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Store className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Shop Owner</h3>
                <p className="text-steel-600">Own a barbershop or salon? Post shifts and find professionals.</p>
              </CardContent>
            </Card>

            <Card 
              className="p-6 bg-card shadow-xl border-2 border-border hover:shadow-2xl hover:border-green-400/50 transition-all duration-300 cursor-pointer group"
              onClick={() => handleRoleSelection('professional')}
            >
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <UserCheck className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Professional</h3>
                <p className="text-steel-600">Barber, stylist, or beauty professional? Find flexible work opportunities.</p>
              </CardContent>
            </Card>

            <Card 
              className="p-6 bg-card shadow-xl border-2 border-border hover:shadow-2xl hover:border-purple-400/50 transition-all duration-300 cursor-pointer group"
              onClick={() => handleRoleSelection('brand')}
            >
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Award className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Brand</h3>
                <p className="text-steel-600">Product company or brand representative? Connect with the professional community.</p>
              </CardContent>
            </Card>

            <Card 
              className="p-6 bg-white shadow-xl border-2 border-orange-300 hover:shadow-2xl hover:border-orange-400 transition-all duration-300 cursor-pointer group"
              onClick={() => handleRoleSelection('trainer')}
            >
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <GraduationCap className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Trainer</h3>
                <p className="text-steel-600">Educator offering courses and training? Share your expertise and monetize your skills.</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-sm text-steel-500 mt-8">
            You can switch between roles anytime by returning to this page.
          </p>
        </div>
      </div>
    </div>
  );
}
