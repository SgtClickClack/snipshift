import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, UserCheck, Award, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { getDashboardRoute } from "@/lib/roles";

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Array<"hub" | "professional" | "brand">>([]);
  const { toast } = useToast();
  const { user, setRolesAndCurrentRole } = useAuth();
  
  const toggleRole = (role: "hub" | "professional" | "brand") => {
    setSelectedRoles((prev) => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handleContinue = async () => {
    if (!user || selectedRoles.length === 0) return;
    setIsLoading(true);
    try {
      // Add each selected role to the user via API
      for (const role of selectedRoles) {
        await apiRequest("PATCH", `/api/users/${user.id}/roles`, { action: "add", role });
      }
      // Set currentRole to the first selected role and sync from server response
      const primaryRole = selectedRoles[0];
      const res = await apiRequest("PATCH", `/api/users/${user.id}/current-role`, { role: primaryRole });
      const updated = await res.json();
      // Merge previously held roles with selected roles to preserve full set in UI
      const mergedRoles = Array.from(new Set([...(user.roles || []), ...selectedRoles]));
      // Persist locally so navbar can immediately reflect choices even before server sync
      try {
        localStorage.setItem('selectedRoles', JSON.stringify(mergedRoles));
      } catch {}
      setRolesAndCurrentRole(mergedRoles as any, updated.currentRole);

      toast({
        title: "Roles updated",
        description: `You're set as ${selectedRoles.join(", ")}. Starting onboarding...`,
      });

      // Redirect to onboarding flow instead of dashboard
      navigate(`/onboarding/${primaryRole}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update your roles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    {
      id: "professional" as const,
      title: "Barber",
      description: "Barbers and stylists looking for work opportunities",
      icon: UserCheck,
      color: "border-steel-300 bg-steel-50/80 hover:bg-red-accent/10 hover:border-red-accent/60 hover:shadow-lg"
    },
    {
      id: "hub" as const,
      title: "Shop",
      description: "Barbershop owners posting jobs and managing staff",
      icon: Store,
      color: "border-chrome-light bg-chrome-light/20 hover:bg-red-accent/10 hover:border-red-accent/60 hover:shadow-lg"
    },
    {
      id: "brand" as const,
      title: "Brand / Coach",
      description: "For product companies and educators to connect with professionals",
      icon: Award,
      color: "border-steel-400 bg-steel-100/60 hover:bg-red-accent/10 hover:border-red-accent/60 hover:shadow-lg"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-chrome-light">
            <Scissors className="text-white text-3xl w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold text-steel-900 mb-3 tracking-tight">Welcome to Snipshift!</h1>
          <p className="text-steel-600 text-lg max-w-md mx-auto leading-relaxed">
            Select one or more roles to personalize your experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const IconComponent = role.icon;
            const isSelected = selectedRoles.includes(role.id);
            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all duration-300 ${role.color} ${
                  isSelected ? 'ring-2 ring-red-accent shadow-xl scale-105' : 'shadow-md'
                } transform hover:scale-105`}
                onClick={() => toggleRole(role.id)}
                data-testid={`button-select-${role.id}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-white/80 shadow-sm ${isSelected ? 'ring-2 ring-red-accent' : ''}`}>
                      <IconComponent className="h-7 w-7 text-steel-700" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-steel-900">
                        {role.title}
                      </CardTitle>
                      <div className="text-sm text-steel-600 mt-1">
                        {isSelected ? 'Selected' : 'Tap to select'}
                      </div>
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
            disabled={selectedRoles.length === 0 || isLoading}
            className="w-full max-w-lg bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-dark hover:to-red-accent text-white font-semibold py-4 px-8 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            data-testid="button-continue"
          >
            {isLoading ? "Setting up your account..." : selectedRoles.length > 1 ? "Continue with selected roles" : "Continue to Dashboard"}
          </Button>
          <p className="text-steel-500 text-sm mt-6 max-w-sm mx-auto">
            You can switch roles anytime from the top navigation.
          </p>
        </div>
      </div>
    </div>
  );
}