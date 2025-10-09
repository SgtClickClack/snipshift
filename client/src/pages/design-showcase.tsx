import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function DesignShowcase() {
  return (
    <div className="min-h-screen bg-neutral-100 py-8" data-testid="design-showcase">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-steel-900 mb-4" data-testid="design-showcase-title">
            Design System Showcase
          </h1>
          <p className="text-steel-600 text-lg">
            Comprehensive display of SnipShift's design system components and styling
          </p>
        </div>

        {/* Button Variants Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-steel-900 mb-6">Button Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="button-grid">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-steel-800">Chrome Buttons</h3>
              <Button 
                className="chrome-gradient text-steel-900 border border-steel-300 hover:-translate-y-0.5 transition-all duration-200"
                data-testid="chrome-button"
              >
                Chrome Button
              </Button>
              <Button 
                className="bg-red-accent hover:bg-red-accent-hover text-white border border-red-accent-dark hover:-translate-y-0.5 transition-all duration-200"
                data-testid="accent-button"
              >
                Accent Button
              </Button>
              <Button 
                className="bg-steel-800 hover:bg-steel-700 text-white border border-steel-600 hover:-translate-y-0.5 transition-all duration-200"
                data-testid="charcoal-button"
              >
                Charcoal Button
              </Button>
              <Button 
                className="bg-gradient-to-r from-steel-500 to-steel-600 hover:from-steel-400 hover:to-steel-500 text-white border border-steel-400 hover:-translate-y-0.5 transition-all duration-200"
                data-testid="steel-button"
              >
                Steel Button
              </Button>
            </div>
          </div>
        </section>

        {/* Card Variants Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-steel-900 mb-6">Card Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card 
              className="chrome-card border-2 border-steel-300 shadow-lg"
              data-testid="card-chrome"
            >
              <CardHeader>
                <CardTitle className="text-steel-900">Chrome Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-steel-600">
                  This card features the chrome gradient styling with metallic finish.
                </p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white border border-steel-200 shadow-xl hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-1"
              data-testid="card-floating"
            >
              <CardHeader>
                <CardTitle className="text-steel-900">Floating Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-steel-600">
                  This card has enhanced shadow and hover effects for a floating appearance.
                </p>
              </CardContent>
            </Card>

            <Card 
              className="charcoal-mirror bg-gradient-to-br from-steel-800 to-steel-900 text-white border border-steel-600 shadow-inner"
              data-testid="card-mirror"
            >
              <CardHeader>
                <CardTitle className="text-white">Mirror Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-steel-300">
                  This card features a dark mirror-like finish with inner shadow effects.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-steel-900 mb-6">Typography</h2>
          <div className="space-y-4">
            <h1 className="heading-chrome text-4xl font-bold text-steel-900" data-testid="heading-chrome">
              Chrome Heading
            </h1>
            <p className="text-steel-gradient text-lg font-medium" data-testid="text-steel-gradient">
              Steel gradient text with professional styling
            </p>
            <p className="text-accent-gradient text-lg font-medium" data-testid="text-accent-gradient">
              Accent gradient text for highlights
            </p>
            <p className="text-charcoal text-base" data-testid="text-charcoal">
              Charcoal text for body content
            </p>
            <p className="text-refined-red text-base font-medium" data-testid="text-refined-red">
              Refined red text for emphasis
            </p>
          </div>
        </section>

        {/* Form Elements Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-steel-900 mb-6">Form Elements</h2>
          <div className="max-w-md space-y-4">
            <div>
              <Label htmlFor="showcase-email" className="text-steel-800">Email Address</Label>
              <Input
                id="showcase-email"
                type="email"
                placeholder="Enter your email"
                className="mt-2 border-steel-300 focus:border-red-accent focus:ring-red-accent"
                data-testid="showcase-input-email"
              />
            </div>
            <div>
              <Label htmlFor="showcase-message" className="text-steel-800">Message</Label>
              <Textarea
                id="showcase-message"
                placeholder="Enter your message"
                className="mt-2 border-steel-300 focus:border-red-accent focus:ring-red-accent"
                data-testid="showcase-textarea"
              />
            </div>
            <Button 
              className="industrial-button w-full"
              data-testid="showcase-submit-button"
            >
              Submit Form
            </Button>
          </div>
        </section>

        {/* Notification Elements Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-steel-900 mb-6">Notifications</h2>
          <div className="space-y-4">
            <div 
              className="bg-green-50 border border-green-200 rounded-lg p-4"
              data-testid="notification-success"
            >
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <p className="text-green-800" data-testid="notification-content">
                  Success notification with proper styling
                </p>
              </div>
            </div>
            <div 
              className="bg-red-50 border border-red-200 rounded-lg p-4"
              data-testid="notification-error"
            >
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <p className="text-red-800">
                  Error notification with proper styling
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Loading States Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-steel-900 mb-6">Loading States</h2>
          <div className="space-y-4">
            <Button 
              className="bg-red-accent text-white opacity-50 cursor-not-allowed"
              disabled
              data-testid="loading-button"
            >
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </div>
            </Button>
            <div 
              className="bg-steel-100 border border-steel-200 rounded-lg p-4"
              data-testid="loading-card"
            >
              <div className="animate-pulse">
                <div className="h-4 bg-steel-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-steel-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility Features Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-steel-900 mb-6">Accessibility Features</h2>
          <div className="space-y-4">
            <Button 
              className="bg-red-accent text-white focus:outline-none focus:ring-2 focus:ring-red-accent focus:ring-offset-2"
              data-testid="accessible-button"
            >
              Accessible Button
            </Button>
            <Input
              type="text"
              placeholder="Accessible input"
              className="border-steel-300 focus:outline-none focus:ring-2 focus:ring-red-accent focus:ring-offset-2"
              data-testid="accessible-input"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
