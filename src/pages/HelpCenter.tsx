/**
 * HelpCenter - Searchable Help Center with Category Navigation
 * 
 * A comprehensive help center with:
 * - Search bar for quick access to help topics
 * - Category cards (Getting Started, Rostering, Xero & Payroll, Your Account)
 * - High-contrast glassmorphism with Electric Lime highlights
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  BookOpen, 
  Calendar, 
  RefreshCw, 
  User, 
  ChevronRight,
  Sparkles,
  FileText,
  Shield,
  Star,
  Zap,
  HelpCircle,
  MessageCircleQuestion,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/seo/SEO';

// Help topics organized by category
const helpTopics = [
  // Getting Started
  { id: 'signup', title: 'Creating Your Account', category: 'getting-started', description: 'Sign up with Google or email and choose your role', keywords: ['signup', 'register', 'create', 'account', 'new'] },
  { id: 'dashboard', title: 'Navigating the Dashboard', category: 'getting-started', description: 'Overview of your personalized dashboard', keywords: ['dashboard', 'home', 'navigate', 'overview'] },
  { id: 'profile', title: 'Setting Up Your Profile', category: 'getting-started', description: 'Complete your profile for better visibility', keywords: ['profile', 'setup', 'bio', 'photo'] },
  { id: 'roles', title: 'Understanding Roles', category: 'getting-started', description: 'Venue owners vs professionals - what\'s the difference', keywords: ['role', 'venue', 'professional', 'hub', 'worker'] },
  
  // Rostering
  { id: 'calendar', title: 'Using the Calendar', category: 'rostering', description: 'Navigate between month, week, and day views', keywords: ['calendar', 'view', 'month', 'week', 'day'] },
  { id: 'create-shift', title: 'Creating Shifts', category: 'rostering', description: 'Add new shifts to your roster', keywords: ['create', 'shift', 'add', 'new', 'roster'] },
  { id: 'capacity', title: 'Capacity Templates', category: 'rostering', description: 'Create reusable staffing patterns', keywords: ['capacity', 'template', 'pattern', 'staffing', 'auto'] },
  { id: 'ateam', title: 'Invite A-Team (Smart Fill)', category: 'rostering', description: 'Bulk invite your favorite staff members', keywords: ['a-team', 'smart fill', 'invite', 'favorite', 'bulk'] },
  { id: 'assign', title: 'Assigning Staff to Shifts', category: 'rostering', description: 'Invite and assign team members', keywords: ['assign', 'staff', 'invite', 'team'] },
  { id: 'status', title: 'Shift Status Indicators', category: 'rostering', description: 'Understanding the traffic light system', keywords: ['status', 'traffic', 'light', 'green', 'amber', 'red'] },
  
  // Xero & Payroll
  { id: 'xero-connect', title: 'Connecting to Xero', category: 'xero', description: 'Link your Xero account for payroll sync', keywords: ['xero', 'connect', 'link', 'integration'] },
  { id: 'xero-mapping', title: 'Mapping Employees to Xero', category: 'xero', description: 'Match HospoGo staff with Xero employees', keywords: ['xero', 'mapping', 'employee', 'match'] },
  { id: 'xero-sync', title: 'Syncing Timesheets', category: 'xero', description: 'Export timesheets to Xero Payroll', keywords: ['xero', 'sync', 'timesheet', 'payroll', 'export'] },
  { id: 'xero-troubleshoot', title: 'Xero Troubleshooting', category: 'xero', description: 'Common issues and solutions', keywords: ['xero', 'troubleshoot', 'error', 'fix', 'problem'] },
  { id: 'mutex', title: 'Understanding Mutex Sync', category: 'xero', description: 'How data integrity is maintained', keywords: ['mutex', 'sync', 'integrity', 'duplicate'] },
  
  // Your Account
  { id: 'settings', title: 'Account Settings', category: 'account', description: 'Update your personal information', keywords: ['settings', 'account', 'personal', 'update'] },
  { id: 'notifications', title: 'Notification Preferences', category: 'account', description: 'Configure push, email, and SMS alerts', keywords: ['notification', 'alert', 'push', 'email', 'sms'] },
  { id: 'vault', title: 'The Vault (Compliance)', category: 'account', description: 'Manage compliance documents securely', keywords: ['vault', 'compliance', 'document', 'rsa', 'certificate'] },
  { id: 'accept-all', title: 'Accept All Feature', category: 'account', description: 'Auto-accept shifts from trusted venues', keywords: ['accept', 'all', 'auto', 'trusted', 'venue'] },
  { id: 'earnings', title: 'Viewing Your Earnings', category: 'account', description: 'Track payments and earnings history', keywords: ['earnings', 'payment', 'money', 'history', 'income'] },
  { id: 'messages', title: 'Messaging & Communication', category: 'account', description: 'In-app messaging and conversations', keywords: ['message', 'chat', 'communication', 'conversation'] },
];

const categories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New to HospoGo? Start here',
    icon: BookOpen,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'rostering',
    title: 'Rostering & Calendar',
    description: 'Shift management and scheduling',
    icon: Calendar,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'xero',
    title: 'Xero & Payroll',
    description: 'Integration and timesheet sync',
    icon: RefreshCw,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'account',
    title: 'Your Account',
    description: 'Settings, compliance, and more',
    icon: User,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
];

// Quick help items for instant answers
const quickHelp = [
  { icon: Zap, label: 'Auto-Fill Roster', link: '#capacity' },
  { icon: Star, label: 'Invite A-Team', link: '#ateam' },
  { icon: RefreshCw, label: 'Sync to Xero', link: '#xero-sync' },
  { icon: Shield, label: 'Upload RSA', link: '#vault' },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) {
      return selectedCategory 
        ? helpTopics.filter(t => t.category === selectedCategory)
        : [];
    }
    
    const query = searchQuery.toLowerCase();
    return helpTopics.filter(topic => 
      topic.title.toLowerCase().includes(query) ||
      topic.description.toLowerCase().includes(query) ||
      topic.keywords.some(k => k.includes(query))
    );
  }, [searchQuery, selectedCategory]);
  
  // Show search results or category selection
  const showSearchResults = searchQuery.trim().length > 0;
  const showCategoryTopics = selectedCategory && !showSearchResults;
  
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Help Center | HospoGo" 
        description="Get help with HospoGo. Find answers to common questions about rostering, Xero integration, and more."
      />
      
      {/* Hero Section with Search */}
      <div className="relative bg-gradient-to-b from-steel-900 via-steel-900/95 to-background border-b border-border overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(186,255,57,0.08),transparent_50%)]" />
        
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#BAFF39]/10 border border-[#BAFF39]/30 text-[#BAFF39] text-sm font-medium mb-4">
              <HelpCircle className="h-4 w-4" />
              <span>Help Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              How can we help you?
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Search our knowledge base or browse by category
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for help topics..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setSelectedCategory(null);
              }}
              className="pl-12 pr-4 py-6 text-lg bg-steel-800/50 border-steel-700 focus:border-[#BAFF39]/50 focus:ring-[#BAFF39]/20 rounded-2xl backdrop-blur-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Quick Help Pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {quickHelp.map((item) => (
              <button
                key={item.label}
                onClick={() => setSearchQuery(item.label)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:border-[#BAFF39]/50 hover:text-[#BAFF39] transition-all"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Search Results */}
        {showSearchResults && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                Search Results
                <Badge variant="secondary" className="ml-2">
                  {filteredTopics.length} {filteredTopics.length === 1 ? 'result' : 'results'}
                </Badge>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </div>
            
            {filteredTopics.length > 0 ? (
              <div className="grid gap-3">
                {filteredTopics.map((topic) => {
                  const category = categories.find(c => c.id === topic.category);
                  return (
                    <Card 
                      key={topic.id}
                      className="bg-card/50 border-border/50 hover:border-[#BAFF39]/30 hover:bg-card/80 transition-all cursor-pointer group"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${category?.bgColor || 'bg-muted'}`}>
                          {category?.icon && <category.icon className={`h-5 w-5 ${category?.color || 'text-muted-foreground'}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground group-hover:text-[#BAFF39] transition-colors">
                            {topic.title}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {topic.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-[#BAFF39] transition-colors" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-8 text-center">
                  <MessageCircleQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try different keywords or browse by category below
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery('')}
                    className="border-[#BAFF39]/30 text-[#BAFF39] hover:bg-[#BAFF39]/10"
                  >
                    Browse Categories
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Category View with Topics */}
        {showCategoryTopics && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedCategory(null)}
                className="text-muted-foreground"
              >
                ← Back to categories
              </Button>
            </div>
            
            {(() => {
              const category = categories.find(c => c.id === selectedCategory);
              if (!category) return null;
              
              return (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-xl ${category.bgColor}`}>
                      <category.icon className={`h-6 w-6 ${category.color}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{category.title}</h2>
                      <p className="text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {filteredTopics.map((topic) => (
                      <Card 
                        key={topic.id}
                        className="bg-card/50 border-border/50 hover:border-[#BAFF39]/30 hover:bg-card/80 transition-all cursor-pointer group"
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <FileText className={`h-5 w-5 ${category.color}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground group-hover:text-[#BAFF39] transition-colors">
                              {topic.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {topic.description}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-[#BAFF39] transition-colors" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}
        
        {/* Category Cards - Show when not searching and no category selected */}
        {!showSearchResults && !showCategoryTopics && (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Browse by Category</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              {categories.map((category) => {
                const topicCount = helpTopics.filter(t => t.category === category.id).length;
                
                return (
                  <Card 
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`bg-card/50 ${category.borderColor} border hover:border-[#BAFF39]/50 hover:shadow-[0_0_20px_rgba(186,255,57,0.1)] transition-all cursor-pointer group`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-xl ${category.bgColor}`}>
                          <category.icon className={`h-6 w-6 ${category.color}`} />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {topicCount} articles
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-lg mb-1 group-hover:text-[#BAFF39] transition-colors">
                        {category.title}
                      </CardTitle>
                      <CardDescription>
                        {category.description}
                      </CardDescription>
                      <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground group-hover:text-[#BAFF39] transition-colors">
                        <span>Explore</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* AI Support CTA */}
            <Card className="bg-gradient-to-r from-[#BAFF39]/5 to-[#BAFF39]/10 border-[#BAFF39]/30">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="p-4 rounded-2xl bg-[#BAFF39]/20">
                    <Sparkles className="h-8 w-8 text-[#BAFF39]" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Can't find what you're looking for?
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Our AI Support Specialist is available 24/7 to answer your questions instantly.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Look for the <span className="text-[#BAFF39] font-medium">support bubble</span> in the bottom right corner of your dashboard.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* External Resources */}
            <div className="mt-12">
              <h3 className="text-lg font-semibold text-foreground mb-4">Additional Resources</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a 
                  href="mailto:support@hospogo.com"
                  className="flex items-center gap-3 p-4 rounded-lg bg-card/30 border border-border/50 hover:border-[#BAFF39]/30 transition-colors group"
                >
                  <MessageCircleQuestion className="h-5 w-5 text-muted-foreground group-hover:text-[#BAFF39]" />
                  <div>
                    <div className="font-medium text-foreground group-hover:text-[#BAFF39]">Email Support</div>
                    <div className="text-sm text-muted-foreground">support@hospogo.com</div>
                  </div>
                </a>
                <Link 
                  to="/venue-guide"
                  className="flex items-center gap-3 p-4 rounded-lg bg-card/30 border border-border/50 hover:border-[#BAFF39]/30 transition-colors group"
                >
                  <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-[#BAFF39]" />
                  <div>
                    <div className="font-medium text-foreground group-hover:text-[#BAFF39]">Venue Guide</div>
                    <div className="text-sm text-muted-foreground">Getting started as a venue</div>
                  </div>
                </Link>
                <a 
                  href="https://status.hospogo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg bg-card/30 border border-border/50 hover:border-[#BAFF39]/30 transition-colors group"
                >
                  <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-[#BAFF39]" />
                  <div>
                    <div className="font-medium text-foreground group-hover:text-[#BAFF39]">System Status</div>
                    <div className="text-sm text-muted-foreground">Check service health</div>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
