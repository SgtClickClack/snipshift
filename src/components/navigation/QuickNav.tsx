import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface QuickNavProps {
  onViewChange?: (view: string) => void;
}

export const QuickNav: React.FC<QuickNavProps> = ({ onViewChange }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const links = [
    { label: 'Calendar', view: 'calendar', testId: 'nav-calendar', extraParams: {} },
    { label: 'Jobs', view: 'jobs', testId: 'nav-jobs', extraParams: {} },
    { label: 'Reputation', view: 'profile', testId: 'nav-reputation', extraParams: { reputation: 'true' } }
  ];

  const handleClick = (link: typeof links[0]) => {
    // Build URL with proper query parameters
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', link.view);
    
    // Add any extra parameters (like reputation=true)
    Object.entries(link.extraParams).forEach(([key, value]) => {
      newParams.set(key, value);
    });
    
    // Navigate with updated search params
    navigate(`/professional-dashboard?${newParams.toString()}`);
    
    // Only call onViewChange if no extra params (to avoid overriding URL params)
    // When extra params are present, the navigation will trigger a re-render and
    // the component will read the view from the URL params
    if (onViewChange && Object.keys(link.extraParams).length === 0) {
      onViewChange(link.view);
    }
  };

  return (
    <nav className="flex flex-col gap-4 p-4 bg-gray-100 rounded-lg" data-testid="quick-navigation">
      <h2 data-testid="quick-navigation-title">Quick Navigation</h2>
      <div className="flex gap-4">
        {links.map(link => (
          <button
            key={link.testId}
            onClick={() => handleClick(link)}
            data-testid={link.testId}
            className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          >
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  );
};
