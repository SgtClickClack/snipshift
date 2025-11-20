import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Users, Package, GraduationCap } from 'lucide-react';

interface GoogleSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleSelected: (role: 'hub' | 'professional' | 'brand' | 'trainer') => void;
  userData: {
    name: string;
    email: string;
    picture?: string;
  };
}

export function GoogleSignupModal({ isOpen, onClose, onRoleSelected, userData }: GoogleSignupModalProps) {
  const [selectedRole, setSelectedRole] = useState<'hub' | 'professional' | 'brand' | 'trainer' | ''>('');

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelected(selectedRole);
      onClose();
    }
  };

  const roleOptions = [
    {
      value: 'professional',
      title: 'Professional',
      description: 'Barber, Hairdresser, or Stylist looking for opportunities',
      icon: Users,
      color: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50',
    },
    {
      value: 'hub',
      title: 'Hub',
      description: 'Barbershop, Salon, or Business posting jobs',
      icon: Building,
      color: 'border-purple-200 bg-purple-50/50 hover:bg-purple-50',
    },
    {
      value: 'brand',
      title: 'Brand',
      description: 'Product company or brand sharing content',
      icon: Package,
      color: 'border-green-200 bg-green-50/50 hover:bg-green-50',
    },
    {
      value: 'trainer',
      title: 'Trainer',
      description: 'Educator offering courses and workshops',
      icon: GraduationCap,
      color: 'border-orange-200 bg-orange-50/50 hover:bg-orange-50',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="google-signup-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {userData.picture && (
              <img
                src={userData.picture}
                alt={userData.name}
                className="w-10 h-10 rounded-full"
              />
            )}
            Welcome, {userData.name}!
          </DialogTitle>
          <DialogDescription>
            To complete your sign-up with Google, please select your account type. This helps us personalize your Snipshift experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose your account type:</Label>
            <RadioGroup value={selectedRole} onValueChange={(value: string) => setSelectedRole(value as 'hub' | 'professional' | 'brand' | 'trainer' | '')}>
              <div className="grid grid-cols-1 gap-3">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Card
                      key={option.value}
                      className={`cursor-pointer transition-colors ${option.color} ${
                        selectedRole === option.value ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedRole(option.value as any)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem
                            value={option.value}
                            id={option.value}
                            data-testid={`role-${option.value}`}
                          />
                          <Icon className="h-5 w-5" />
                          <CardTitle className="text-sm font-medium">
                            {option.title}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pl-10">
                        <CardDescription className="text-xs">
                          {option.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedRole}
              data-testid="button-continue"
            >
              Continue to Snipshift
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}