import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  Users, 
  MessageCircle, 
  Eye, 
  Heart, 
  TrendingUp,
  Calendar,
  Award,
  Star
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
            icon: Briefcase,
            description: 'Active job postings',
            color: 'text-blue-600'
          },
          {
            title: 'Applications',
            value: stats.totalApplications || 0,
            icon: Users,
            description: 'Total applications received',
            color: 'text-green-600'
          },
          {
            title: 'Messages',
            value: stats.unreadMessages || 0,
            icon: MessageCircle,
            description: 'Unread messages',
            color: 'text-orange-600'
          },
          {
            title: 'This Month',
            value: stats.monthlyHires || 0,
            icon: Award,
            description: 'Successful hires',
            color: 'text-purple-600'
          }
        ];
      
      case 'professional':
        return [
          {
            title: 'Applications',
            value: stats.activeApplications || 0,
            icon: Briefcase,
            description: 'Active job applications',
            color: 'text-blue-600'
          },
          {
            title: 'Bookings',
            value: stats.upcomingBookings || 0,
            icon: Calendar,
            description: 'Upcoming confirmed jobs',
            color: 'text-green-600'
          },
          {
            title: 'Messages',
            value: stats.unreadMessages || 0,
            icon: MessageCircle,
            description: 'Unread messages',
            color: 'text-orange-600'
          },
          {
            title: 'Rating',
            value: stats.averageRating || 0,
            icon: Star,
            description: 'Average client rating',
            color: 'text-yellow-600',
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
            color: 'text-blue-600'
          },
          {
            title: 'Total Views',
            value: stats.totalViews || 0,
            icon: Eye,
            description: 'Views across all posts',
            color: 'text-green-600'
          },
          {
            title: 'Likes',
            value: stats.totalLikes || 0,
            icon: Heart,
            description: 'Total likes received',
            color: 'text-red-600'
          },
          {
            title: 'Inquiries',
            value: stats.inquiries || 0,
            icon: MessageCircle,
            description: 'Product inquiries',
            color: 'text-orange-600'
          }
        ];
      
      case 'trainer':
        return [
          {
            title: 'Programs',
            value: stats.activePrograms || 0,
            icon: Award,
            description: 'Active training programs',
            color: 'text-blue-600'
          },
          {
            title: 'Students',
            value: stats.totalStudents || 0,
            icon: Users,
            description: 'Total enrolled students',
            color: 'text-green-600'
          },
          {
            title: 'Workshops',
            value: stats.upcomingWorkshops || 0,
            icon: Calendar,
            description: 'Upcoming workshops',
            color: 'text-purple-600'
          },
          {
            title: 'Reviews',
            value: stats.averageRating || 0,
            icon: Star,
            description: 'Average program rating',
            color: 'text-yellow-600',
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
        const gradientColors = [
          'from-blue-500 to-blue-600',
          'from-green-500 to-green-600', 
          'from-purple-500 to-purple-600',
          'from-red-accent to-red-accent-hover'
        ];
        
        return (
          <Card key={index} className="bg-white/95 backdrop-blur-sm shadow-xl border-2 border-steel-300/50 hover:shadow-2xl transition-all duration-300" data-testid={`stat-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`rounded-lg bg-gradient-to-br ${gradientColors[index]} p-3 shadow-md`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-steel-700">{stat.title}</p>
                  <p className="text-2xl font-bold text-steel-900" data-testid={`stat-value-${index}`}>
                    {stat.value.toLocaleString()}{stat.suffix || ''}
                  </p>
                  <p className="text-xs text-steel-600">{stat.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}