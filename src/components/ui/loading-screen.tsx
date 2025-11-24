import React from 'react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900 transition-opacity duration-300" data-testid="loading-screen">
      <div className="flex items-center justify-center mb-6 min-h-[150px]">
        <img 
          src="/brand-logo.png" 
          alt="Snipshift" 
          className="w-64 h-auto object-contain invert animate-pulse"
        />
      </div>
      <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
      <div className="mt-4 text-sm text-white/80 tracking-wide font-sans">Loading...</div>
    </div>
  );
}

