import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  Users,
  Eye,
  Heart, 
  TrendingUp,
  Calendar,
  Award,
  Star,
  Scissors,
  FileText,
  MessageSquare,
  Handshake
} from 'lucide-react';

interface DashboardStatsProps {
  role: 'hub' | 'professional' | 'brand' | 'trainer';
  stats: {
    [key: string]: number;
  };
}

export default function DashboardStats({ role, stats }: DashboardStatsProps) {
  const getStatsConfig = () => {
    switch (role) {
      case 'hub':
        return [
          {
            title: 'Open Jobs',
            value: stats.openJobs || 0,
            icon: Scissors,
            description: 'Active job postings',
          },
          {
            title: 'Applications',
            value: stats.totalApplications || 0,
            icon: FileText,
            description: 'Total applications received',
          },
          {
            title: 'Messages',
            value: stats.unreadMessages || 0,
            icon: MessageSquare,
            description: 'Unread messages',
          },
          {
            title: 'This Month',
            value: stats.monthlyHires || 0,
            icon: Handshake,
            description: 'Successful hires',
          }
        ];
      
      case 'professional':
        return [
          {
            title: 'Applications',
            value: stats.activeApplications || 0,
            icon: Briefcase,
            description: 'Active job applications',
          },
          {
            title: 'Bookings',
            value: stats.upcomingBookings || 0,
            icon: Calendar,
            description: 'Upcoming confirmed jobs',
          },
          {
            title: 'Messages',
            value: stats.unreadMessages || 0,
            icon: MessageSquare,
            description: 'Unread messages',
          },
          {
            title: 'Rating',
            value: stats.averageRating || 0,
            icon: Star,
            description: 'Average client rating',
            suffix: '/5'
          }
        ];
      
      case 'brand':
        return [
          {
            title: 'Active Posts',
            value: stats.activePosts || 0,
            icon: TrendingUp,
            description: 'Published product posts',
          },
          {
            title: 'Total Views',
            value: stats.totalViews || 0,
            icon: Eye,
            description: 'Views across all posts',
          },
          {
            title: 'Likes',
            value: stats.totalLikes || 0,
            icon: Heart,
            description: 'Total likes received',
          },
          {
            title: 'Inquiries',
            value: stats.inquiries || 0,
            icon: MessageSquare,
            description: 'Product inquiries',
          }
        ];
      
      case 'trainer':
        return [
          {
            title: 'Programs',
            value: stats.activePrograms || 0,
            icon: Award,
            description: 'Active training programs',
          },
          {
            title: 'Students',
            value: stats.totalStudents || 0,
            icon: Users,
            description: 'Total enrolled students',
          },
          {
            title: 'Workshops',
            value: stats.upcomingWorkshops || 0,
            icon: Calendar,
            description: 'Upcoming workshops',
          },
          {
            title: 'Reviews',
            value: stats.averageRating || 0,
            icon: Star,
            description: 'Average program rating',
            suffix: '/5'
          }
        ];
      
      default:
        return [];
    }
  };

  const statsConfig = getStatsConfig();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsConfig.map((stat, index) => {
        return (
          <Card key={index} className="bg-white/95 backdrop-blur-sm shadow-xl border-2 border-steel-300/50 hover:shadow-2xl transition-all duration-300" data-testid={`stat-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-steel-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-steel-900 mt-1" data-testid={`stat-value-${index}`}>
                    {stat.value.toLocaleString()}{stat.suffix || ''}
                  </p>
                  <p className="text-xs text-steel-500 mt-1">{stat.description}</p>
                </div>
                <div className="rounded-full bg-steel-50 p-3 border border-steel-100">
                  <stat.icon className="h-6 w-6 text-steel-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}