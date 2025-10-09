import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Users, Calendar, DollarSign, BarChart3, PieChart } from 'lucide-react';

interface AnalyticsData {
  totalShiftsPosted: number;
  totalApplications: number;
  applicationRate: number;
  hireRate: number;
  averagePayRate: number;
  totalEarnings: number;
}

const mockAnalytics: AnalyticsData = {
  totalShiftsPosted: 24,
  totalApplications: 156,
  applicationRate: 6.5,
  hireRate: 0.75,
  averagePayRate: 32.50,
  totalEarnings: 2840
};

export default function AnalyticsPage() {
  const [analytics] = useState<AnalyticsData>(mockAnalytics);
  const [timeFilter, setTimeFilter] = useState('last-30-days');

  return (
    <div className="min-h-screen bg-gray-50" data-testid="analytics-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your performance and insights</p>
        </div>

        {/* Time Filter */}
        <div className="mb-6">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-48" data-testid="time-filter">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days" data-testid="option-last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days" data-testid="option-last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days" data-testid="option-last-90-days">Last 90 days</SelectItem>
              <SelectItem value="last-year" data-testid="option-last-year">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="analytics-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts Posted</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-shifts-posted">{analytics.totalShiftsPosted}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-applications">{analytics.totalApplications}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Application Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="application-rate">{analytics.applicationRate}</div>
              <p className="text-xs text-muted-foreground">
                Applications per shift
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hire Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="hire-rate">{analytics.hireRate}%</div>
              <p className="text-xs text-muted-foreground">
                Successful hires
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Applications Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg" data-testid="applications-chart">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Chart visualization would go here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="performance-metrics">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Pay Rate</span>
                  <span className="font-semibold" data-testid="average-pay-rate">${analytics.averagePayRate}/hr</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Earnings</span>
                  <span className="font-semibold" data-testid="total-earnings">${analytics.totalEarnings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="font-semibold">2.3 hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customer Rating</span>
                  <span className="font-semibold">4.8/5</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics Data */}
        <div className="mt-6" data-testid="analytics-data">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Top Skills in Demand</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Fade Techniques (85%)</li>
                    <li>• Beard Styling (72%)</li>
                    <li>• Customer Service (68%)</li>
                    <li>• Mobile Services (45%)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Peak Application Times</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Monday 9-11 AM (32%)</li>
                    <li>• Tuesday 2-4 PM (28%)</li>
                    <li>• Wednesday 10-12 PM (25%)</li>
                    <li>• Friday 3-5 PM (22%)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Geographic Distribution</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Sydney (45%)</li>
                    <li>• Melbourne (32%)</li>
                    <li>• Brisbane (18%)</li>
                    <li>• Other (5%)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
