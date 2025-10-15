import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, UserCheck, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { getDashboardRoute } from "@/lib/roles";

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"professional" | "business" | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, setRolesAndCurrentRole } = useAuth();
  
  const selectRole = (role: "professional" | "business") => {
    setSelectedRole(role);
  };

  const handleContinue = async () => {
    if (!user || !selectedRole) return;
    setIsLoading(true);
    try {
      // Set the user's role and current role
      const roles = selectedRole === "professional" ? ["professional"] : ["professional", "business"];
      await apiRequest("PATCH", `/api/users/${user.id}/roles`, { roles });
      const res = await apiRequest("PATCH", `/api/users/${user.id}/current-role`, { role: selectedRole });
      const updated = await res.json();
      
      // Update local state
      setRolesAndCurrentRole(roles as any, updated.currentRole);

      setSuccess("Welcome! Your role has been set.");
      toast({
        title: "Role updated",
        description: `You're now set as a ${selectedRole === "professional" ? "Professional" : "Business"}.`,
      });

      // Redirect to appropriate dashboard
      const dashboardRoute = getDashboardRoute(selectedRole);
      navigate(dashboardRoute);
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
      title: "I want to find shifts",
      subtitle: "Professional",
      description: "Barbers, stylists, and technicians looking for flexible work opportunities",
      icon: UserCheck,
      color: "border-steel-300 bg-steel-50/80 hover:bg-red-accent/10 hover:border-red-accent/60 hover:shadow-lg",
      isDefault: true
    },
    {
      id: "business" as const,
      title: "I want to offer shifts",
      subtitle: "Business",
      description: "Barbershops, salons, and businesses posting shifts and managing staff",
      icon: Store,
      color: "border-chrome-light bg-chrome-light/20 hover:bg-red-accent/10 hover:border-red-accent/60 hover:shadow-lg",
      isDefault: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-chrome-light">
            <Scissors className="text-white text-3xl w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold text-steel-900 mb-3 tracking-tight" data-testid="role-selection-title">Welcome to Snipshift!</h1>
          <p className="text-steel-600 text-lg max-w-lg mx-auto leading-relaxed">
            Choose how you'd like to use Snipshift. You can always switch between roles later.
          </p>
          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md max-w-md mx-auto">
              <p className="text-green-600 text-sm" data-testid="success-message">{success}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {roles.map((role) => {
            const IconComponent = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all duration-300 ${role.color} ${
                  isSelected ? 'ring-2 ring-red-accent shadow-xl scale-105' : 'shadow-md'
                } transform hover:scale-105`}
                onClick={() => selectRole(role.id)}
                data-testid={`button-select-${role.id}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg bg-white/80 shadow-sm ${isSelected ? 'ring-2 ring-red-accent' : ''}`}>
                      <IconComponent className="h-8 w-8 text-steel-700" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-steel-900 mb-1">
                        {role.title}
                      </CardTitle>
                      <div className="text-lg font-semibold text-red-accent mb-2">
                        {role.subtitle}
                      </div>
                      {role.isDefault && (
                        <div className="text-sm text-steel-500 bg-steel-100 px-2 py-1 rounded-full inline-block">
                          Default
                        </div>
                      )}
                    </div>
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

        <div className="mt-10 text-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedRole || isLoading}
            className="w-full max-w-lg bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-dark hover:to-red-accent text-white font-semibold py-4 px-8 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            data-testid="confirm-role-button"
          >
            {isLoading ? "Setting up your account..." : `Continue as ${selectedRole === "professional" ? "Professional" : "Business"}`}
          </Button>
          <p className="text-steel-500 text-sm mt-6 max-w-sm mx-auto">
            You can switch between Professional and Business roles anytime from your profile.
          </p>
        </div>
      </div>
    </div>
  );
}