import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Users,
  Eye,
  Heart, 
  TrendingUp,
  Calendar,
  Award,
  Star,
  FastForward,
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

export default function DashboardStats({ role, stats, onStatClick }: DashboardStatsProps) {
  const getStatsConfig = (): StatItem[] => {
    switch (role) {
      case 'hub':
        return [
          {
            title: 'Active Shifts',
            value: stats.openJobs || 0,
            icon: FastForward,
            description: 'Active shift postings',
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
            title: 'Upcoming Shifts',
            value: stats.upcomingBookings || 0,
            icon: Calendar,
            description: 'Upcoming confirmed shifts',
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
    // VISUAL FIDELITY OVERHAUL: Reduced gap for tighter layout
    <motion.div
      className="grid max-[480px]:grid-cols-1 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {(statsConfig || []).map((stat, index) => {
        // Map variants to distinct brand-aligned styles
        // VISUAL FIDELITY: Updated to use subtler, more refined styling
        const getVariantStyles = (variant: string | undefined) => {
          switch (variant) {
            case 'accent': // Brand Neon - Refined glow outline
              return {
                icon: 'text-[#CCFF00]',
                bg: 'bg-transparent border-[#CCFF00]/60 shadow-[0_0_10px_rgba(204,255,0,0.15)]'
              };
            case 'steel': // Charcoal/Steel Base - Glassmorphic
              return {
                icon: 'text-zinc-300',
                bg: 'bg-white/5 backdrop-blur-sm border-zinc-700/50'
              };
            case 'accent-secondary': // Brand Neon - Subtle neon
              return {
                icon: 'text-[#CCFF00]/80',
                bg: 'bg-[#CCFF00]/5 border-[#CCFF00]/30'
              };
            case 'chrome': // Metallic - Glassmorphic
            default:
              return {
                icon: 'text-zinc-400',
                bg: 'bg-white/5 backdrop-blur-sm border-zinc-700/50'
              };
          }
        };

        const styles = getVariantStyles((stat as any).variant);
        const isClickable = !!onStatClick && !!stat.action;

        return (
          <motion.div key={stat.title} variants={itemVariants}>
            {/* VISUAL FIDELITY: Glassmorphic card with refined hierarchy */}
            <Card 
              className={`group relative overflow-hidden bg-[#1e293b] border border-white/10 shadow-sm transition-all duration-300 ${
                isClickable 
                  ? 'cursor-pointer hover:shadow-lg hover:border-[#CCFF00]/30 hover:-translate-y-0.5 active:scale-[0.98]' 
                  : 'hover:shadow-md hover:border-white/20'
              }`} 
              data-testid={`stat-card-${index}`}
              onClick={() => isClickable && onStatClick(stat.action!)}
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#CCFF00]/30 to-transparent opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300" />
              {/* VISUAL FIDELITY: Reduced padding for compact cards */}
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* TYPOGRAPHY REFINEMENT: Urbanist 500 for labels, smaller size */}
                    <p 
                      className="text-[10px] sm:text-xs font-medium text-zinc-400 tracking-wide uppercase truncate"
                      style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                    >
                      {stat.title}
                    </p>
                    <div className="mt-1 flex items-baseline gap-1">
                      {/* TYPOGRAPHY REFINEMENT: Urbanist 900 for metrics only */}
                      <span 
                        className="text-xl sm:text-2xl text-foreground tracking-tight" 
                        style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 900 }}
                        data-testid={`stat-value-${index}`}
                      >
                        {stat.title === 'Rating' && (stat.value === 0 || !stat.value) ? 'New' : `${stat.value.toLocaleString()}${stat.suffix || ''}`}
                      </span>
                    </div>
                    {/* VISUAL FIDELITY: Smaller, subtler description */}
                    <p 
                      className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 font-medium truncate"
                      style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                    >
                      {stat.description}
                    </p>
                  </div>
                  {/* VISUAL FIDELITY: Smaller icon container */}
                  <div className={`rounded-lg p-2 border transition-colors duration-300 flex-shrink-0 ${styles.bg}`}>
                    <stat.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all duration-300 group-hover:scale-105 ${styles.icon}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}