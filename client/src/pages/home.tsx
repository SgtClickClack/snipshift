import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Store, UserCheck, Award, GraduationCap, Scissors } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getDashboardRoute } from "@/lib/roles";

export default function HomePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, setRolesAndCurrentRole } = useAuth();

  // Force all users to stay on home page for role selection
  useEffect(() => {
    if (!user) {
      // No user logged in, redirect to landing page
      navigate('/');
      return;
    }
    // All authenticated users can access this page regardless of role
  }, [user, navigate]);

  const handleRoleSelection = async (role: "hub" | "professional" | "brand") => {
    setIsLoading(true);
    
    try {
      // Add role and set as currentRole
      await apiRequest("PATCH", `/api/users/${user!.id}/roles`, { action: "add", role });
      await apiRequest("PATCH", `/api/users/${user!.id}/current-role`, { role });
      const mergedRoles = Array.from(new Set([...(user!.roles || []), role]));
      setRolesAndCurrentRole(mergedRoles as any, role);
      
      toast({
        title: "Role added!",
        description: `${role} role added to your account. Taking you to your ${role} dashboard.`,
      });

      // Redirect to dashboard for this role
      const targetDashboard = getDashboardRoute(role);
      if (import.meta.env.MODE !== 'production') console.log('🎯 Navigating to dashboard:', targetDashboard);
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
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full shadow-xl">
              <Scissors className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-steel-900 mb-6">
            Welcome to Snipshift!
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
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card 
              className="p-6 bg-white shadow-xl border-2 border-steel-300/50 hover:shadow-2xl hover:border-blue-400/50 transition-all duration-300 cursor-pointer group"
              onClick={() => handleRoleSelection('hub')}
            >
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Store className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Shop</h3>
                <p className="text-steel-600">Barbershop owners posting jobs and managing staff</p>
              </CardContent>
            </Card>

            <Card 
              className="p-6 bg-white shadow-xl border-2 border-steel-300/50 hover:shadow-2xl hover:border-green-400/50 transition-all duration-300 cursor-pointer group"
              onClick={() => handleRoleSelection('professional')}
            >
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <UserCheck className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Barber</h3>
                <p className="text-steel-600">Barbers and stylists looking for work opportunities</p>
              </CardContent>
            </Card>

            <Card 
              className="p-6 bg-white shadow-xl border-2 border-steel-300/50 hover:shadow-2xl hover:border-purple-400/50 transition-all duration-300 cursor-pointer group"
              onClick={() => handleRoleSelection('brand')}
            >
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Award className="text-white h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-steel-900">Brand / Coach</h3>
                <p className="text-steel-600">For product companies and educators to connect with professionals</p>
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
