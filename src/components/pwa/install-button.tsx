import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

interface InstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * PWA Install Button Component
 * Only renders when the app can be installed (prompt available & not already installed).
 * Triggers the native browser install prompt on click.
 */
export function InstallButton({
  variant = 'outline',
  size = 'default',
  className
}: InstallButtonProps) {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={promptInstall}
      className={className}
      title="Install HospoGo app"
    >
      <Download className="h-4 w-4 mr-2 text-current" />
      <span>Download App</span>
    </Button>
  );
}

