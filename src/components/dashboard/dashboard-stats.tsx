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
          <Card key={index} className="group relative overflow-hidden bg-white border border-steel-200 shadow-sm hover:shadow-md hover:border-steel-300 transition-all duration-300" data-testid={`stat-card-${index}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-steel-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{stat.title}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground tracking-tight" data-testid={`stat-value-${index}`}>
                      {stat.value.toLocaleString()}{stat.suffix || ''}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.description}</p>
                </div>
                <div className="rounded-xl bg-steel-50 p-3 border border-steel-100 group-hover:bg-steel-100 transition-colors duration-300">
                  <stat.icon className="h-5 w-5 text-steel-600 group-hover:text-foreground transition-colors duration-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}