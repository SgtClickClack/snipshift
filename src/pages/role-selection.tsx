import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, UserCheck, Award, GraduationCap, FastForward } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { getDashboardRoute, mapRoleToApiRole } from "@/lib/roles";

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Array<"hub" | "professional" | "brand" | "trainer">>([]);
  const { toast } = useToast();
  const { user, setCurrentRole, updateRoles } = useAuth();
  
  const toggleRole = (role: "hub" | "professional" | "brand" | "trainer") => {
    setSelectedRoles((prev) => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handleContinue = async () => {
    if (!user || selectedRoles.length === 0) return;
    setIsLoading(true);

    try {
      // Add each selected role to the user via API
      for (const role of selectedRoles) {
        const response = await apiRequest("PATCH", `/api/users/${user.id}/roles`, { action: "add", role });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || `HTTP ${response.status}` };
          }
          throw new Error(errorData.message || `Failed to add role: ${role}`);
        }
      }
      
      // Update client-side roles so the navbar switcher sees them immediately
      updateRoles(Array.from(new Set([...(user.roles || []), ...selectedRoles])) as any);
      
      // Set currentRole to the first selected role
      const primaryRole = selectedRoles[0];
      
      // Map frontend role to backend API role
      const dbRole = mapRoleToApiRole(primaryRole);
      
      const currentRoleResponse = await apiRequest("PATCH", `/api/users/${user.id}/current-role`, { role: dbRole });
      
      if (!currentRoleResponse.ok) {
        const errorText = await currentRoleResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${currentRoleResponse.status}` };
        }
        throw new Error(errorData.message || `Failed to set current role`);
      }
      
      setCurrentRole(primaryRole);

      toast({
        title: "Roles updated",
        description: `You're set as ${selectedRoles.join(", ")}. Redirecting...`,
      });

      navigate(getDashboardRoute(primaryRole));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create your role. Please try again.",
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
      description: "Barber, stylist, or beauty professional",
      icon: UserCheck,
      color: "border-steel-700 bg-steel-800/80 hover:bg-brand-neon/10 hover:border-brand-neon/60 hover:shadow-lg"
    },
    {
      id: "hub" as const,
      title: "Shop Owner",
      description: "Own a barbershop or salon",
      icon: Store,
      color: "border-steel-700 bg-steel-800/60 hover:bg-brand-neon/10 hover:border-brand-neon/60 hover:shadow-lg"
    },
    {
      id: "brand" as const,
      title: "Brand",
      description: "Product company or brand representative",
      icon: Award,
      color: "border-steel-700 bg-steel-800/70 hover:bg-brand-neon/10 hover:border-brand-neon/60 hover:shadow-lg"
    },
    {
      id: "trainer" as const,
      title: "Trainer",
      description: "Educator offering courses and training",
      icon: GraduationCap,
      color: "border-steel-700 bg-steel-800/60 hover:bg-brand-neon/10 hover:border-brand-neon/60 hover:shadow-lg"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-900 via-steel-800 to-steel-950 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-brand-neon rounded-full flex items-center justify-center mb-6 shadow-neon-realistic border-2 border-brand-neon/40">
            <FastForward className="text-brand-dark text-3xl w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">Welcome to HospoGo!</h1>
          <p className="text-steel-300 text-lg max-w-md mx-auto leading-relaxed">
            Select one or more roles to personalize your experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const IconComponent = role.icon;
            const isSelected = selectedRoles.includes(role.id);
            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all duration-300 ${role.color} ${
                  isSelected ? 'ring-2 ring-brand-neon shadow-xl scale-105' : 'shadow-md'
                } transform hover:scale-105`}
                onClick={() => toggleRole(role.id)}
                data-testid={`button-select-${role.id}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-steel-700/50 shadow-sm ${isSelected ? 'ring-2 ring-brand-neon' : ''}`}>
                      <IconComponent className="h-7 w-7 text-steel-200" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-foreground">
                        {role.title}
                      </CardTitle>
                      <div className="text-sm text-steel-300 mt-1">
                        {isSelected ? 'Selected' : 'Tap to select'}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-steel-300 text-base leading-relaxed">
                    {role.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Button
            variant="accent"
            onClick={handleContinue}
            disabled={selectedRoles.length === 0 || isLoading}
            className="w-full max-w-lg font-semibold py-4 px-8 text-lg"
            data-testid="button-continue"
          >
            {isLoading ? "Setting up your account..." : selectedRoles.length > 1 ? "Continue with selected roles" : "Continue to Dashboard"}
          </Button>
          <p className="text-steel-400 text-sm mt-6 max-w-sm mx-auto">
            You can switch roles anytime from the top navigation.
          </p>
        </div>
      </div>
    </div>
  );
}