import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Search, 
  MessageCircle, 
  Calendar, 
  TrendingUp,
  Users,
  FileText,
  Settings
} from 'lucide-react';

interface QuickActionsProps {
  role: 'hub' | 'professional' | 'brand' | 'trainer';
  onAction: (action: string) => void;
}

export default function QuickActions({ role, onAction }: QuickActionsProps) {
  const getActionsConfig = () => {
    switch (role) {
      case 'hub':
        return [
          {
            title: 'Post New Job',
            description: 'Create a new job listing',
            icon: Plus,
            action: 'post-job',
            variant: 'default' as const,
            className: 'bg-primary hover:bg-primary/90'
          },
          {
            title: 'View Applications',
            description: 'Review job applications',
            icon: Users,
            action: 'view-applications',
            variant: 'outline' as const
          },
          {
            title: 'Messages',
            description: 'Chat with professionals',
            icon: MessageCircle,
            action: 'open-messages',
            variant: 'outline' as const
          },
          {
            title: 'Settings',
            description: 'Manage your hub profile',
            icon: Settings,
            action: 'profile-settings',
            variant: 'ghost' as const
          }
        ];
      
      case 'professional':
        return [
          {
            title: 'Browse Jobs',
            description: 'Find available opportunities',
            icon: Search,
            action: 'browse-jobs',
            variant: 'default' as const,
            className: 'bg-primary hover:bg-primary/90'
          },
          {
            title: 'My Applications',
            description: 'Track your applications',
            icon: FileText,
            action: 'my-applications',
            variant: 'outline' as const
          },
          {
            title: 'Calendar',
            description: 'View upcoming bookings',
            icon: Calendar,
            action: 'view-calendar',
            variant: 'outline' as const
          },
          {
            title: 'Messages',
            description: 'Chat with shop owners',
            icon: MessageCircle,
            action: 'open-messages',
            variant: 'outline' as const
          }
        ];
      
      case 'brand':
        return [
          {
            title: 'Messages',
            description: 'Connect with community',
            icon: MessageCircle,
            action: 'open-messages',
            variant: 'outline' as const
          },
          {
            title: 'Profile',
            description: 'Manage your brand profile',
            icon: Settings,
            action: 'profile-settings',
            variant: 'outline' as const
          }
          // Disabled for stability: Create Post, Analytics, Social Feed (no backend implementation)
        ];
      
      case 'trainer':
        return [
          {
            title: 'Messages',
            description: 'Connect with professionals',
            icon: MessageCircle,
            action: 'open-messages',
            variant: 'outline' as const
          },
          {
            title: 'Profile',
            description: 'Manage your trainer profile',
            icon: Settings,
            action: 'profile-settings',
            variant: 'outline' as const
          }
          // Disabled for stability: Create Training, My Students, Schedule, Community (no backend implementation)
        ];
      
      default:
        return [];
    }
  };

  const actionsConfig = getActionsConfig();

  return (
    <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-3">
          {actionsConfig.map((action, index) => (
            <Button
              key={index}
              className={`h-auto p-4 flex flex-col items-start text-left shadow-md hover:shadow-lg transition-all duration-200 ${
                action.variant === 'default' 
                  ? 'bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white'
                  : 'bg-gradient-to-r from-steel-600 to-steel-700 hover:from-steel-700 hover:to-steel-800 text-white'
              } ${action.className || ''}`}
              onClick={() => onAction(action.action)}
              data-testid={`quick-action-${action.action}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <action.icon className="h-4 w-4" />
                <span className="font-medium text-sm">{action.title}</span>
              </div>
              <span className="text-xs opacity-80">{action.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}