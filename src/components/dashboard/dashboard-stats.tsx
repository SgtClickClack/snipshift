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
  onStatClick?: (action: string) => void;
}

interface StatItem {
  title: string;
  value: number;
  icon: any;
  description: string;
  variant?: string;
  suffix?: string;
  action?: string;
}

export default function DashboardStats({ role, stats, onStatClick }: DashboardStatsProps) {
  const getStatsConfig = (): StatItem[] => {
    switch (role) {
      case 'hub':
        return [
          {
            title: 'Active Shifts',
            value: stats.openJobs || 0,
            icon: Scissors,
            description: 'Active job postings',
            variant: 'accent',
            action: 'jobs'
          },
          {
            title: 'Applications',
            value: stats.totalApplications || 0,
            icon: FileText,
            description: 'Total applications received',
            variant: 'steel',
            action: 'applications'
          },
          {
            title: 'Messages',
            value: stats.unreadMessages || 0,
            icon: MessageSquare,
            description: 'Unread messages',
            variant: 'chrome',
            action: 'messages'
          },
          {
            title: 'This Month',
            value: stats.monthlyHires || 0,
            icon: Handshake,
            description: 'Successful hires',
            variant: 'accent-secondary',
            action: 'hires'
          }
        ];
      
      case 'professional':
        return [
          {
            title: 'Applications',
            value: stats.activeApplications || 0,
            icon: Briefcase,
            description: 'Active job applications',
            variant: 'accent',
            action: 'applications'
          },
          {
            title: 'Bookings',
            value: stats.upcomingBookings || 0,
            icon: Calendar,
            description: 'Upcoming confirmed jobs',
            variant: 'steel',
            action: 'bookings'
          },
          {
            title: 'Messages',
            value: stats.unreadMessages || 0,
            icon: MessageSquare,
            description: 'Unread messages',
            variant: 'chrome',
            action: 'messages'
          },
          {
            title: 'Rating',
            value: stats.averageRating && stats.averageRating > 0 ? stats.averageRating : 0,
            icon: Star,
            description: stats.averageRating > 0 ? 'Average client rating' : 'No ratings yet',
            suffix: stats.averageRating > 0 ? '/5' : '',
            variant: 'accent-secondary',
            action: 'reviews'
          }
        ];
      
      case 'brand':
        return [
          {
            title: 'Active Posts',
            value: stats.activePosts || 0,
            icon: TrendingUp,
            description: 'Published product posts',
            variant: 'accent'
          },
          {
            title: 'Total Views',
            value: stats.totalViews || 0,
            icon: Eye,
            description: 'Views across all posts',
            variant: 'steel'
          },
          {
            title: 'Likes',
            value: stats.totalLikes || 0,
            icon: Heart,
            description: 'Total likes received',
            variant: 'accent-secondary'
          },
          {
            title: 'Inquiries',
            value: stats.inquiries || 0,
            icon: MessageSquare,
            description: 'Product inquiries',
            variant: 'chrome'
          }
        ];
      
      case 'trainer':
        return [
          {
            title: 'Programs',
            value: stats.activePrograms || 0,
            icon: Award,
            description: 'Active training programs',
            variant: 'accent'
          },
          {
            title: 'Students',
            value: stats.totalStudents || 0,
            icon: Users,
            description: 'Total enrolled students',
            variant: 'steel'
          },
          {
            title: 'Workshops',
            value: stats.upcomingWorkshops || 0,
            icon: Calendar,
            description: 'Upcoming workshops',
            variant: 'chrome'
          },
          {
            title: 'Reviews',
            value: stats.averageRating || 0,
            icon: Star,
            description: stats.averageRating > 0 ? 'Average program rating' : 'No ratings yet',
            suffix: stats.averageRating > 0 ? '/5' : '',
            variant: 'accent-secondary'
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
        // Map variants to distinct brand-aligned styles
        const getVariantStyles = (variant: string | undefined) => {
          switch (variant) {
            case 'accent': // Red Action - Solid Red
              return {
                icon: 'text-white',
                bg: 'bg-red-accent border-red-accent shadow-sm'
              };
            case 'steel': // Charcoal/Steel Base - Solid Chrome Dark
              return {
                icon: 'text-white',
                bg: 'bg-chrome-dark border-chrome-dark shadow-sm'
              };
            case 'accent-secondary': // Red/Charcoal Mix - Solid Dark Red
              return {
                icon: 'text-white',
                bg: 'bg-red-accent-dark border-red-accent-dark shadow-sm'
              };
            case 'chrome': // Metallic - Solid Chrome Medium
            default:
              return {
                icon: 'text-steel-900',
                bg: 'bg-chrome-medium border-chrome-medium shadow-sm'
              };
          }
        };

        const styles = getVariantStyles((stat as any).variant);
        const isClickable = !!onStatClick && !!stat.action;

        return (
          <Card 
            key={stat.title} 
            className={`group relative overflow-hidden bg-card border border-border shadow-sm transition-all duration-300 ${
              isClickable 
                ? 'cursor-pointer hover:shadow-md hover:border-steel-300 hover:-translate-y-1 active:scale-[0.98]' 
                : 'hover:shadow-md hover:border-steel-300'
            }`} 
            data-testid={`stat-card-${index}`}
            onClick={() => isClickable && onStatClick(stat.action!)}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-steel-400 to-transparent opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{stat.title}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground tracking-tight" data-testid={`stat-value-${index}`}>
                      {stat.title === 'Rating' && (stat.value === 0 || !stat.value) ? 'New' : `${stat.value.toLocaleString()}${stat.suffix || ''}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.description}</p>
                </div>
                <div className={`rounded-xl p-3 border transition-colors duration-300 ${styles.bg}`}>
                  <stat.icon className={`h-5 w-5 transition-colors duration-300 ${styles.icon}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}