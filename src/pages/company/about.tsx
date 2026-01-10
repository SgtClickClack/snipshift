import { SEO } from '@/components/seo/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Handshake, Users, Zap, Target } from 'lucide-react';

export default function AboutPage() {
  return (
    <>
      <SEO
        title="About Us"
        description="Learn about HospoGo's mission to connect barbers, stylists, and professionals with flexible work opportunities."
        url="/about"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-steel-900 mb-4">
              About HospoGo
            </h1>
            <p className="text-xl text-steel-600 max-w-2xl mx-auto">
              Connecting barbers, stylists, and professionals with flexible work opportunities
            </p>
          </div>

          {/* Mission Section */}
          <Card className="card-chrome mb-8">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-brand-neon rounded-lg shadow-neon-realistic">
                  <Target className="h-6 w-6 text-brand-dark" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-steel-900 mb-3">Our Mission</h2>
                  <p className="text-steel-700 text-lg leading-relaxed">
                    HospoGo bridges the gap between barbershops and salons that need flexible staffing, 
                    and talented professionals seeking work opportunities. We believe in empowering the gig economy within 
                    the barbering and beauty industry, making it easier for businesses to find qualified talent and for professionals 
                    to build their careers on their own terms.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Story Section */}
          <Card className="card-chrome mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">Our Story</h2>
              <div className="prose prose-slate max-w-none text-steel-700 space-y-4">
                <p>
                  The industry has always been built on flexibility and talent. Barbershops need coverage for busy 
                  weekends. Salons need specialists for special events. Professionals want to work when and where they choose. 
                  Yet, finding these connections has been fragmented and inefficient.
                </p>
                <p>
                  HospoGo was born from the recognition that the traditional job board model doesn't work for the 
                  industry. We're not just matching resumes to job descriptions—we're building a community where professionals 
                  can showcase their skills, businesses can find trusted talent, and everyone benefits from the flexibility 
                  that makes the industry thrive.
                </p>
                <p>
                  Whether you're a barber looking for weekend shifts, a salon owner needing coverage during peak seasons, 
                  or a brand looking to connect with professionals, HospoGo provides the tools and platform to 
                  make those connections seamless.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Values Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="card-chrome">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Handshake className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-steel-900 mb-2">Trust & Safety</h3>
                <p className="text-steel-600 text-sm">
                  Verified profiles and secure transactions ensure every connection is built on trust.
                </p>
              </CardContent>
            </Card>

            <Card className="card-chrome">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-steel-900 mb-2">Community First</h3>
                <p className="text-steel-600 text-sm">
                  We're building more than a platform—we're fostering a community of professionals.
                </p>
              </CardContent>
            </Card>

            <Card className="card-chrome">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-steel-900 mb-2">Flexibility</h3>
                <p className="text-steel-600 text-sm">
                  Work when you want, where you want. Post shifts when you need coverage. Total control.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="card-chrome">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">Join the Movement</h2>
              <p className="text-steel-700 mb-6 max-w-2xl mx-auto">
                Whether you're a professional looking for opportunities or a business seeking talent, 
                HospoGo is here to help you succeed in the industry.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center px-6 py-3 bg-brand-neon text-brand-dark font-bold rounded-md shadow-neon-realistic hover:bg-brand-neon/90 transition-all"
                >
                  Get Started
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 bg-steel-200 text-steel-900 font-semibold rounded-md hover:bg-steel-300 transition-all"
                >
                  Contact Us
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

