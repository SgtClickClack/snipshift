import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, UserCheck, Award, GraduationCap, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"hub" | "professional" | "brand" | "trainer" | null>(null);
  const { toast } = useToast();
  const { user, updateUserRole } = useAuth();
  
  console.log('🔧 Current user role:', user?.role); // Debug log

  const handleRoleSelection = async (role: "hub" | "professional" | "brand" | "trainer") => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Update user role via API
      await apiRequest("PATCH", `/api/users/${user.id}/role`, { role });
      
      // Update local auth state
      updateUserRole(role);
      
      toast({
        title: "Role selected!",
        description: `Welcome! Let's set up your ${role} profile.`,
      });

      // Redirect to role-specific dashboard
      const dashboardMap = {
        hub: '/hub-dashboard',
        professional: '/professional-dashboard',
        brand: '/brand-dashboard',
        trainer: '/trainer-dashboard'
      };
      
      const targetDashboard = dashboardMap[role];
      navigate(targetDashboard);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update your role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    {
      id: "professional" as const,
      title: "Professional",
      description: "Barber, stylist, or creative professional",
      icon: UserCheck,
      color: "border-steel-300 bg-steel-50/80 hover:bg-red-accent/10 hover:border-red-accent/60 hover:shadow-lg"
    },
    {
      id: "hub" as const,
      title: "Hub Owner",
      description: "Own a barbershop, salon, or creative space",
      icon: Store,
      color: "border-chrome-light bg-chrome-light/20 hover:bg-red-accent/10 hover:border-red-accent/60 hover:shadow-lg"
    },
    {
      id: "brand" as const,
      title: "Brand",
      description: "Product company or brand representative",
      icon: Award,
      color: "border-steel-400 bg-steel-100/60 hover:bg-red-accent/10 hover:border-red-accent/60 hover:shadow-lg"
    },
    {
      id: "trainer" as const,
      title: "Trainer",
      description: "Educator offering courses and training",
      icon: GraduationCap,
      color: "border-chrome-dark bg-chrome-dark/10 hover:bg-red-accent/10 hover:border-red-accent/60 hover:shadow-lg"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-chrome-light">
            <Scissors className="text-white text-3xl w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold text-steel-900 mb-3 tracking-tight">Welcome to Snipshift!</h1>
          <p className="text-steel-600 text-lg max-w-md mx-auto leading-relaxed">
            Choose a role to access that dashboard. You can have multiple roles on your account.
          </p>
          
          {/* Force Reset Button */}
          <div className="mt-6">
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs border-steel-300 text-steel-600 hover:bg-steel-100"
              onClick={() => {
                console.log('🔄 Force reset - redirecting to home');
                navigate('/home');
              }}
            >
              FORCE RESET - Back to Home View
            </Button>
          </div>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const IconComponent = role.icon;
            const isSelected = selectedRole === role.id;
            
            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all duration-300 ${role.color} ${
                  isSelected ? 'ring-2 ring-red-accent shadow-xl scale-105' : 'shadow-md'
                } transform hover:scale-105`}
                onClick={() => setSelectedRole(role.id)}
                data-testid={`button-select-${role.id}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-white/80 shadow-sm">
                      <IconComponent className="h-7 w-7 text-steel-700" />
                    </div>
                    <CardTitle className="text-xl font-bold text-steel-900">
                      {role.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-steel-600 text-base leading-relaxed">
                    {role.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="mt-10 text-center">
          <Button
            onClick={() => selectedRole && handleRoleSelection(selectedRole)}
            disabled={!selectedRole || isLoading}
            className="w-full max-w-lg bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-dark hover:to-red-accent text-white font-semibold py-4 px-8 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            data-testid="button-continue"
          >
            {isLoading ? "Setting up your account..." : "Continue to Dashboard"}
          </Button>
          
          <p className="text-steel-500 text-sm mt-6 max-w-sm mx-auto">
            Don't worry, you can change this later in your profile settings
          </p>
        </div>
      </div>
    </div>
  );
}