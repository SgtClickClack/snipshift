import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Star, Heart, Scissors, User } from 'lucide-react';

export const DesignSystemShowcase = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-steel-50 p-8" data-testid="design-showcase">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="heading-chrome text-4xl md:text-6xl">
            Snipshift Design System
          </h1>
          <p className="text-accent-gradient text-xl">
            Black & Chrome Design Language
          </p>
        </div>

        {/* Button Showcase */}
        <section className="card-chrome space-y-6">
          <h2 className="heading-chrome text-2xl">Chrome Button System</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="button-grid">
            <Button variant="chrome" size="lg" data-testid="chrome-button">
              Chrome Button
            </Button>
            <Button variant="accent" size="lg" data-testid="accent-button">
              Accent Red
            </Button>
            <Button variant="charcoal" size="lg" data-testid="charcoal-button">
              Charcoal
            </Button>
            <Button variant="steel" size="lg" data-testid="steel-button">
              Steel
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="chrome" size="sm">Small Chrome</Button>
            <Button variant="accent" size="sm">Small Accent</Button>
            <Button variant="chrome" size="icon"><Scissors className="h-4 w-4" /></Button>
            <Button variant="accent" size="icon"><Heart className="h-4 w-4" /></Button>
          </div>
        </section>

        {/* Card Showcase */}
        <section className="space-y-6">
          <h2 className="heading-chrome text-2xl">Chrome Cards & Surfaces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Card className="card-chrome">
              <CardHeader>
                <CardTitle className="heading-chrome flex items-center gap-2">
                  <Scissors className="h-5 w-5 icon-steel" />
                  Standard Chrome Card
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-steel-600 mb-4">
                  Professional barbershop services with authentic chrome styling.
                </p>
                <div className="flex gap-2">
                  <Badge className="badge-steel">Professional</Badge>
                  <Badge className="badge-accent">Featured</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="card-floating">
              <CardHeader>
                <CardTitle className="heading-chrome flex items-center gap-2">
                  <Star className="h-5 w-5 icon-accent" />
                  Floating Chrome
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-steel-600 mb-4">
                  Elevated surface with premium shadow effects.
                </p>
                <Button variant="accent" className="w-full">
                  Book Now
                </Button>
              </CardContent>
            </Card>

            <Card className="charcoal-mirror">
              <CardHeader>
                <CardTitle className="heading-chrome flex items-center gap-2 text-steel-900">
                  <User className="h-5 w-5 icon-steel" />
                  Mirror Effect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-steel-700 mb-4">
                  Reflective surface like a salon mirror.
                </p>
                <Button variant="charcoal" className="w-full">
                  View Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Form Showcase */}
        <section className="space-y-6">
          <h2 className="heading-chrome text-2xl">Chrome Forms & Inputs</h2>
          <Card className="form-chrome max-w-2xl">
            <CardHeader>
              <CardTitle className="heading-chrome">Professional Contact Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                className="input-chrome" 
                placeholder="Your name"
                type="text"
              />
              <Input 
                className="input-chrome" 
                placeholder="Email address"
                type="email"
              />
              <textarea 
                className="input-chrome min-h-[100px] resize-none"
                placeholder="Tell us about your barbershop needs..."
              />
              <div className="flex gap-3">
                <Button variant="accent" className="flex-1">
                  Submit Request
                </Button>
                <Button variant="chrome">
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Icon & Badge Showcase */}
        <section className="card-chrome space-y-6">
          <h2 className="heading-chrome text-2xl">Icons & Badges</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Bell className="h-6 w-6 icon-steel" />
              <Star className="h-6 w-6 icon-accent" />
              <Scissors className="h-6 w-6 icon-steel" />
              <Heart className="h-6 w-6 icon-accent" />
              <User className="h-6 w-6 icon-steel" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge className="badge-accent">New</Badge>
              <Badge className="badge-steel">Professional</Badge>
              <Badge className="badge-accent">Featured</Badge>
              <Badge className="badge-steel">Verified</Badge>
              <Badge className="badge-accent">Premium</Badge>
            </div>
          </div>
        </section>

        {/* Notification Showcase */}
        <section className="space-y-6">
          <h2 className="heading-chrome text-2xl">Chrome Notifications</h2>
          <div className="space-y-4">
            <div className="notification-chrome">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 icon-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="heading-chrome text-sm">New Job Available</h4>
                  <p className="text-steel-600 text-sm">
                    Premium barbershop position in CBD area - $35/hour
                  </p>
                </div>
              </div>
            </div>
            <div className="notification-chrome">
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 icon-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="heading-chrome text-sm">Training Course Available</h4>
                  <p className="text-steel-600 text-sm">
                    Advanced fading techniques by master trainer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Typography Showcase */}
        <section className="card-chrome space-y-6">
          <h2 className="heading-chrome text-2xl">Chrome Typography</h2>
          <div className="space-y-4">
            <h1 className="text-steel-gradient text-4xl font-bold">
              Steel Gradient Heading
            </h1>
            <h2 className="text-accent-gradient text-2xl">
              Red Accent Gradient
            </h2>
            <p className="text-charcoal text-lg">
              Deep charcoal body text for excellent readability
            </p>
            <p className="text-refined-red font-semibold">
              Sophisticated red accent text
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};