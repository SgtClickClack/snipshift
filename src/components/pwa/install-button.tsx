import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/use-install-prompt';

interface InstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * PWA Install Button Component
 * Displays a button to install the PWA when available
 * Hidden if the app is already installed or not supported
 */
export function InstallButton({ 
  variant = 'outline', 
  size = 'default',
  className 
}: InstallButtonProps) {
  const { canInstall, promptInstall } = useInstallPrompt();

  // Don't render if install is not available or app is already installed
  if (!canInstall) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={promptInstall}
      className={className}
    >
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
}

