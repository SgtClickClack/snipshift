import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-entry';
import { 
  CheckCircle, 
  DollarSign, 
  Calendar, 
  Users, 
  TrendingUp, 
  Zap,
  Shield,
  Crown
} from 'lucide-react';

export const DesignSystemShowcase = () => {
  return (
    <div className="min-h-screen bg-background p-8" data-testid="design-showcase">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black italic text-foreground tracking-tight">
            HOSPO<span className="text-[#BAFF39]">GO</span> Design System
          </h1>
          <p className="text-xl text-[#BAFF39] font-urbanist-900">
            Calm Confidence — Premium Dark UI
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Obsidian surfaces with Electric Lime surgical accents. Every interaction whispers quality.
          </p>
        </div>

        {/* Button Showcase */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Button System</h2>
            <p className="text-sm text-muted-foreground">Primary actions glow with Electric Lime authority</p>
          </div>
          
          <StaggerContainer>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="button-grid">
              <StaggerItem>
                <Button variant="default" size="lg" className="w-full" data-testid="primary-button">
                  Primary Action
                </Button>
              </StaggerItem>
              <StaggerItem>
                <Button variant="accent" size="lg" className="w-full" data-testid="accent-button">
                  Accent Glow
                </Button>
              </StaggerItem>
              <StaggerItem>
                <Button variant="refined-glow" size="lg" className="w-full" data-testid="refined-button">
                  Refined Glow
                </Button>
              </StaggerItem>
              <StaggerItem>
                <Button variant="outline" size="lg" className="w-full" data-testid="outline-button">
                  Secondary
                </Button>
              </StaggerItem>
            </div>
          </StaggerContainer>

          <div className="flex flex-wrap gap-3">
            <Button variant="default" size="sm">Small Primary</Button>
            <Button variant="accent" size="sm">Small Accent</Button>
            <Button variant="refined-glow" size="icon"><Zap className="h-4 w-4" /></Button>
            <Button variant="default" size="icon"><CheckCircle className="h-4 w-4" /></Button>
          </div>
        </section>

        {/* Card Showcase with Stagger Animation */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Glassmorphic Cards</h2>
            <p className="text-sm text-muted-foreground">Frosted glass surfaces that float above the darkness</p>
          </div>
          
          <StaggerContainer>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <StaggerItem>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <DollarSign className="h-5 w-5 text-[#BAFF39]" />
                      Revenue Metric
                    </CardTitle>
                    <CardDescription>Live financial tracking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-[#BAFF39] mb-2">$12,450</p>
                    <p className="text-sm text-muted-foreground">
                      This week's projected revenue
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Badge className="bg-[#BAFF39]/20 text-[#BAFF39] border-[#BAFF39]/40">Live</Badge>
                      <Badge className="bg-success/20 text-success border-success/30">+12%</Badge>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-5 w-5 text-[#BAFF39]" />
                      Shift Overview
                    </CardTitle>
                    <CardDescription>Weekly capacity dashboard</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground mb-2">42/48</p>
                    <p className="text-sm text-muted-foreground">
                      Shifts filled this week
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#BAFF39]" />
                      <span className="text-sm text-[#BAFF39] font-medium">87.5% fill rate</span>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Crown className="h-5 w-5 text-[#BAFF39]" />
                      Reliability Crown
                    </CardTitle>
                    <CardDescription>Elite professional status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Awarded for 0 strikes and 10+ completed shifts
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-[#BAFF39]/10 border border-[#BAFF39]/30">
                      <Shield className="h-5 w-5 text-[#BAFF39]" />
                      <span className="text-sm font-semibold text-[#BAFF39]">Elite Status</span>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            </div>
          </StaggerContainer>
        </section>

        {/* Form Showcase */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Forms & Inputs</h2>
            <p className="text-sm text-muted-foreground">Clean, focused data entry</p>
          </div>
          
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-foreground">Professional Contact</CardTitle>
              <CardDescription>Reach out to venue managers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Your name"
                type="text"
              />
              <Input 
                placeholder="Email address"
                type="email"
              />
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell us about your hospitality experience..."
              />
              <div className="flex gap-3">
                <Button variant="default" className="flex-1">
                  Send Message
                </Button>
                <Button variant="outline">
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Icon & Badge Showcase */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Icons & Badges</h2>
            <p className="text-sm text-muted-foreground">Surgical use of Electric Lime for emphasis</p>
          </div>
          
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Calendar className="h-6 w-6 text-[#BAFF39]" />
                <Users className="h-6 w-6 text-muted-foreground" />
                <TrendingUp className="h-6 w-6 text-[#BAFF39]" />
                <Shield className="h-6 w-6 text-muted-foreground" />
                <Crown className="h-6 w-6 text-[#BAFF39]" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-[#BAFF39]/20 text-[#BAFF39] border-[#BAFF39]/40">Live</Badge>
                <Badge className="bg-success/20 text-success border-success/30">Confirmed</Badge>
                <Badge className="bg-[#BAFF39]/10 text-[#BAFF39] border-[#BAFF39]/30">Featured</Badge>
                <Badge variant="outline">Standard</Badge>
                <Badge className="bg-[#BAFF39]/20 text-[#BAFF39] border-[#BAFF39]/40">Premium</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Typography Showcase */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Typography Hierarchy</h2>
            <p className="text-sm text-muted-foreground">Urbanist 900 for hero metrics, Inter for body text</p>
          </div>
          
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  PROJECTED ARR
                </p>
                <h1 className="text-4xl font-black italic text-[#BAFF39] font-urbanist-900">
                  $178,800
                </h1>
              </div>
              
              <div className="h-px bg-border" />
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  Heading Level 2 — Geometric Confidence
                </h2>
                <p className="text-base text-foreground leading-relaxed">
                  Body text uses Inter for workhorse clarity. This is the paragraph weight that users read for extended periods. It maintains excellent readability against dark backgrounds.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Secondary text in muted foreground for supporting details, timestamps, and metadata that should recede visually but remain accessible.
                </p>
                <p className="text-xs text-foreground-subtle">
                  Tertiary text for disabled states and the most subtle UI elements.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Color Palette */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Color System</h2>
            <p className="text-sm text-muted-foreground">Single source of truth: #BAFF39</p>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="h-20 rounded-lg bg-[#BAFF39]" />
                  <p className="text-xs font-mono text-foreground">#BAFF39</p>
                  <p className="text-xs text-muted-foreground">Electric Lime</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg bg-background border border-border" />
                  <p className="text-xs font-mono text-foreground">var(--background)</p>
                  <p className="text-xs text-muted-foreground">True Dark</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg" style={{ background: 'hsl(var(--surface-1))' }} />
                  <p className="text-xs font-mono text-foreground">var(--surface-1)</p>
                  <p className="text-xs text-muted-foreground">Cards</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg" style={{ background: 'hsl(var(--surface-2))' }} />
                  <p className="text-xs font-mono text-foreground">var(--surface-2)</p>
                  <p className="text-xs text-muted-foreground">Elevated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="text-center py-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Designed for the <span className="text-[#BAFF39]">$168M Neighborhood Economy</span>
          </p>
        </div>
      </div>
    </div>
  );
};
