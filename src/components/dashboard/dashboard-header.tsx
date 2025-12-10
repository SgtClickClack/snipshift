import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  /** Banner image URL */
  bannerImage?: string | null;
  /** Profile/Logo image URL */
  profileImage?: string | null;
  /** Title text (e.g., "Professional Dashboard" or business name) */
  title: string;
  /** Subtitle text (e.g., user email or business description) */
  subtitle?: string;
  /** Additional className for the container */
  className?: string;
}

export default function DashboardHeader({
  bannerImage,
  profileImage,
  title,
  subtitle,
  className,
}: DashboardHeaderProps) {
  const avatarInitials = title
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className={cn("relative w-full h-48 md:h-64 rounded-lg overflow-visible mb-16", className)}>
      {/* Banner Image or Gradient Fallback */}
      {bannerImage ? (
        <img
          src={bannerImage}
          alt="Banner"
          className="w-full h-full object-cover rounded-lg"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg" />
      )}

      {/* Avatar/Logo Container (overlapping bottom-left) */}
      <div className="absolute -bottom-12 left-4 z-10">
        <div className="relative">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-lg">
            <AvatarImage src={profileImage || undefined} alt={title} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Title and Subtitle (overlapping bottom-right) */}
      <div className="absolute -bottom-12 left-40 md:left-48 right-4 z-10">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm md:text-base text-muted-foreground truncate mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

