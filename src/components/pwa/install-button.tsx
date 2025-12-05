import { Button } from '@/components/ui/button';
import { Download, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/use-install-prompt';

interface InstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * PWA Install Button Component
 * Displays a button to install the PWA when available
 * Hidden if the app is already installed
 */
export function InstallButton({ 
  variant = 'outline', 
  size = 'default',
  className 
}: InstallButtonProps) {
  const { canInstall, promptInstall, deferredPrompt, isInstalled } = useInstallPrompt();

  // Debug logging
  if (import.meta.env.DEV) {
    console.log('InstallButton render:', { canInstall, hasDeferredPrompt: !!deferredPrompt, isInstalled });
  }

  // Don't render if app is already installed
  if (isInstalled) {
    return null;
  }

  // Always render the button, but disable it if install prompt isn't available yet
  return (
    <Button
      variant={variant}
      size={size}
      onClick={canInstall ? promptInstall : undefined}
      disabled={!canInstall}
      className={className}
      title={canInstall ? 'Install Snipshift app' : 'Install prompt will appear soon'}
    >
      <Smartphone className="h-4 w-4 mr-2 text-current" />
      <span>Install App</span>
    </Button>
  );
}

