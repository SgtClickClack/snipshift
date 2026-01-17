/**
 * Non-blocking auth loading overlay
 * Shows a subtle overlay that allows the layout to render underneath
 * while authentication is being determined
 */
export function AuthLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Non-blocking auth wrapper that renders children with loading overlay
 * when auth is not ready, instead of blocking completely
 */
export function NonBlockingAuthWrapper({ 
  isLoading, 
  children 
}: { 
  isLoading: boolean; 
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && <AuthLoadingOverlay />}
    </div>
  );
}
