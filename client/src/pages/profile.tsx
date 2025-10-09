import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { User, Edit, Plus, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user, login } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.displayName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleEditProfile = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!user) return;

      // Validate form data
      if (!formData.name.trim()) {
        setError("Name is required");
        return;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setError("Please enter a valid email address");
        return;
      }

      // Update profile via API
      const response = await apiRequest("PATCH", `/api/users/${user.id}/profile`, {
        profileType: user.currentRole,
        data: {
          fullName: formData.name,
          email: formData.email,
        }
      });

      const updatedUser = await response.json();
      
      // Update local auth state
      const newUser = {
        ...user,
        displayName: formData.name,
        email: formData.email,
        updatedAt: new Date(),
      };
      login(newUser);

      setSuccess("Profile updated successfully");
      setIsEditing(false);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to update profile";
      setError(errorMessage);
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    if (user) {
      setFormData({
        name: user.displayName || "",
        email: user.email || "",
      });
    }
  };

  const handleAddRole = async (role: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await apiRequest("PATCH", `/api/users/${user.id}/roles`, {
        action: "add",
        role
      });
      
      setSuccess("Role added successfully");
      toast({
        title: "Role added",
        description: `You now have access to ${role} features`,
      });
      
      // Refresh user data
      const userResponse = await apiRequest("GET", `/api/users/${user.id}`);
      const updatedUser = await userResponse.json();
      login(updatedUser);
    } catch (error: any) {
      setError("Failed to add role");
      toast({
        title: "Error",
        description: "Failed to add role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRole = async (role: string) => {
    if (!user) return;
    
    // Don't allow removing the last role
    if (user.roles && user.roles.length <= 1) {
      setError("Cannot remove your last remaining role");
      return;
    }
    
    setIsLoading(true);
    try {
      await apiRequest("PATCH", `/api/users/${user.id}/roles`, {
        action: "remove",
        role
      });
      
      setSuccess("Role removed successfully");
      toast({
        title: "Role removed",
        description: `You no longer have access to ${role} features`,
      });
      
      // Refresh user data
      const userResponse = await apiRequest("GET", `/api/users/${user.id}`);
      const updatedUser = await userResponse.json();
      login(updatedUser);
    } catch (error: any) {
      setError("Failed to remove role");
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeCurrentRole = async (role: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await apiRequest("PATCH", `/api/users/${user.id}/current-role`, {
        role
      });
      
      setSuccess("Current role updated");
      toast({
        title: "Role updated",
        description: `You are now using ${role} features`,
      });
      
      // Refresh user data
      const userResponse = await apiRequest("GET", `/api/users/${user.id}`);
      const updatedUser = await userResponse.json();
      login(updatedUser);
    } catch (error: any) {
      setError("Failed to update current role");
      toast({
        title: "Error",
        description: "Failed to update current role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-8" data-testid="profile-page">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Profile</h1>
          <p className="text-neutral-600">Manage your account settings and roles</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm" data-testid="error-message">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm" data-testid="success-message">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Profile Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditProfile}
                    data-testid="button-edit-profile"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      data-testid="input-display-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      data-testid="save-profile-button"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <p className="text-sm text-neutral-600" data-testid="profile-name">
                      {user.displayName || "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-neutral-600" data-testid="profile-email">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Roles & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Current Role</Label>
                  <p className="text-sm text-neutral-600" data-testid="current-role-display">
                    {user.currentRole || "None"}
                  </p>
                </div>
                
                <div>
                  <Label>All Roles</Label>
                  <div className="flex flex-wrap gap-2 mt-2" data-testid="user-roles">
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <div key={role} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          <span>{role}</span>
                          {user.roles && user.roles.length > 1 && (
                            <button
                              onClick={() => handleRemoveRole(role)}
                              className="text-red-600 hover:text-red-800"
                              data-testid={`remove-role-button-${role}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500">No roles assigned</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Add Role</Label>
                  <div className="flex gap-2">
                    {["hub", "professional", "brand", "trainer"].map((role) => (
                      !user.roles?.includes(role) && (
                        <Button
                          key={role}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddRole(role)}
                          disabled={isLoading}
                          data-testid="add-role-button"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {role}
                        </Button>
                      )
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Switch Current Role</Label>
                  <select
                    value={user.currentRole || ""}
                    onChange={(e) => handleChangeCurrentRole(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded"
                    data-testid="current-role-select"
                  >
                    {user.roles?.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => user.currentRole && handleChangeCurrentRole(user.currentRole)}
                    disabled={isLoading}
                    data-testid="update-current-role-button"
                  >
                    Update Current Role
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}