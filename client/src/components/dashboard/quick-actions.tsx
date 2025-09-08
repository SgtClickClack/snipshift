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
  Settings,
  Shield
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
            title: 'Get Insured',
            description: 'Professional insurance quotes',
            icon: Shield,
            action: 'get-insurance',
            variant: 'default' as const,
            className: 'bg-blue-600 hover:bg-blue-700'
          },
          {
            title: 'My Applications',
            description: 'Track your applications',
            icon: FileText,
            action: 'my-applications',
            variant: 'outline' as const
          },
          {
            title: 'Messages',
            description: 'Chat with hub owners',
            icon: MessageCircle,
            action: 'open-messages',
            variant: 'outline' as const
          }
        ];
      
      case 'brand':
        return [
          {
            title: 'Create Post',
            description: 'Share a new product or offer',
            icon: Plus,
            action: 'create-post',
            variant: 'default' as const,
            className: 'bg-primary hover:bg-primary/90'
          },
          {
            title: 'Analytics',
            description: 'View post performance',
            icon: TrendingUp,
            action: 'view-analytics',
            variant: 'outline' as const
          },
          {
            title: 'Social Feed',
            description: 'Browse community posts',
            icon: Users,
            action: 'social-feed',
            variant: 'outline' as const
          },
          {
            title: 'Messages',
            description: 'Connect with community',
            icon: MessageCircle,
            action: 'open-messages',
            variant: 'outline' as const
          }
        ];
      
      case 'trainer':
        return [
          {
            title: 'Create Training',
            description: 'Add a new course or workshop',
            icon: Plus,
            action: 'create-training',
            variant: 'default' as const,
            className: 'bg-primary hover:bg-primary/90'
          },
          {
            title: 'My Students',
            description: 'Manage enrolled students',
            icon: Users,
            action: 'my-students',
            variant: 'outline' as const
          },
          {
            title: 'Schedule',
            description: 'View upcoming sessions',
            icon: Calendar,
            action: 'view-schedule',
            variant: 'outline' as const
          },
          {
            title: 'Community',
            description: 'Connect with other trainers',
            icon: MessageCircle,
            action: 'trainer-community',
            variant: 'outline' as const
          }
        ];
      
      default:
        return [];
    }
  };

  const actionsConfig = getActionsConfig();

  return (
    <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-steel-300/50">
      <CardHeader className="bg-gradient-to-b from-steel-50 to-white rounded-t-lg border-b border-steel-200/50">
        <CardTitle className="text-steel-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actionsConfig.map((action, index) => (
            <Button
              key={index}
              className={`w-full h-auto p-4 flex flex-col items-start text-left shadow-md hover:shadow-lg transition-all duration-200 break-words whitespace-normal ${
                action.variant === 'default' 
                  ? 'bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white'
                  : 'bg-gradient-to-r from-steel-600 to-steel-700 hover:from-steel-700 hover:to-steel-800 text-white'
              } ${action.className || ''}`}
              onClick={() => onAction(action.action)}
              data-testid={`quick-action-${action.action}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <action.icon className="h-4 w-4" />
                <span className="font-medium text-sm leading-snug break-words whitespace-normal">{action.title}</span>
              </div>
              <span className="text-xs opacity-80 leading-snug break-words whitespace-normal">{action.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}