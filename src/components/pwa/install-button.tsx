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
 * Displays a button to install the PWA when available
 * Hidden if the app is already installed
 */
export function InstallButton({ 
  variant = 'outline', 
  size = 'default',
  className 
}: InstallButtonProps) {
  const { canInstall, promptInstall, deferredPrompt, isInstalled } = useInstallPrompt();

  // Always render the button for now to debug visibility
  // Disable it if app is already installed or prompt isn't available
  const isDisabled = isInstalled || !canInstall;
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={canInstall && !isInstalled ? promptInstall : undefined}
      disabled={isDisabled}
      className={className}
      title={
        isInstalled 
          ? 'App already installed' 
          : canInstall 
            ? 'Install Snipshift app' 
            : 'Install prompt will appear soon'
      }
    >
      <Download className="h-4 w-4 mr-2 text-current" />
      <span>Install App</span>
    </Button>
  );
}

