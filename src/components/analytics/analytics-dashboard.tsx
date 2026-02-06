interface AnalyticsDashboardProps {
  userRole: string;
}

export function AnalyticsDashboard(_props: AnalyticsDashboardProps) {
  // TODO: Replace with actual API call when analytics API is implemented
  // For now, return empty state
  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
      </div>
      <div className="text-center text-muted-foreground p-8">
        <p className="text-lg font-semibold mb-2">Analytics Coming Soon</p>
        <p className="text-sm">Analytics data will be available once the API is integrated.</p>
      </div>
    </div>
  );
}
