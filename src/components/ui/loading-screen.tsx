const logoUrl = '/brand-wordmark-transparent.png';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background dark:bg-steel-900 transition-opacity duration-300" data-testid="loading-screen">
      <div className="flex items-center justify-center mb-6 min-h-36">
        <img
          src={logoUrl} 
          alt="HospoGo" 
          className="w-72 max-w-[85vw] h-auto object-contain animate-pulse"
          style={{
            imageRendering: 'auto',
            filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.25))',
            WebkitFontSmoothing: 'antialiased',
          }}
          loading="eager"
          width={256}
          height={256}
        />
      </div>
      <div className="w-10 h-10 border-4 border-border dark:border-white/10 border-t-primary dark:border-t-blue-500 rounded-full animate-spin"></div>
      <div className="mt-4 text-sm text-muted-foreground dark:text-white/80 tracking-wide font-sans">Loading...</div>
    </div>
  );
}

