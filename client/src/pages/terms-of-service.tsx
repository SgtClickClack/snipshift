import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Scale, Shield, FileText, AlertTriangle } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Scale className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-neutral-900">Terms of Service</h1>
          </div>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Welcome to Snipshift. These terms govern your use of our platform connecting 
            barbershops, professionals, brands, and trainers in the creative industry.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline">Effective: September 2025</Badge>
            <Badge variant="outline">Version 1.0</Badge>
            <Badge className="bg-green-600">Australian Law</Badge>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Summary */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <FileText className="h-5 w-5 mr-2" />
                Quick Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <ul className="space-y-1 list-disc list-inside">
                <li>Snipshift is a marketplace connecting industry professionals</li>
                <li>We facilitate payments but don't employ users directly</li>
                <li>All users must comply with professional standards and Australian law</li>
                <li>We charge platform fees for payment processing and services</li>
                <li>Disputes are handled through our internal process first</li>
              </ul>
            </CardContent>
          </Card>

          {/* Acceptance of Terms */}
          <Card>
            <CardHeader>
              <CardTitle>1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                By accessing or using Snipshift ("the Platform"), you agree to be bound by these 
                Terms of Service and all applicable laws and regulations. If you do not agree 
                with any part of these terms, you may not use our services.
              </p>
              <p>
                These terms apply to all users of the Platform, including Hub Owners (barbershops), 
                Professionals (barbers and stylists), Brands (product companies), and Trainers 
                (educators).
              </p>
            </CardContent>
          </Card>

          {/* Platform Services */}
          <Card>
            <CardHeader>
              <CardTitle>2. Platform Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">2.1 Marketplace Functions</h4>
                <p>
                  Snipshift provides a digital marketplace that connects:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Hub Owners:</strong> Post job opportunities and find qualified professionals</li>
                  <li><strong>Professionals:</strong> Find work opportunities and access training content</li>
                  <li><strong>Brands:</strong> Promote products and offer exclusive deals</li>
                  <li><strong>Trainers:</strong> Monetize educational content and expertise</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">2.2 Payment Processing</h4>
                <p>
                  We facilitate secure payments through Stripe Connect, including:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Training content purchases with escrow protection</li>
                  <li>Platform fees (typically 10% of transaction value)</li>
                  <li>Automated payouts to service providers</li>
                  <li>Dispute resolution and refund processing</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* User Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle>3. User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">3.1 Professional Standards</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Maintain valid professional licenses where required</li>
                  <li>Provide accurate and up-to-date profile information</li>
                  <li>Comply with workplace health and safety regulations</li>
                  <li>Maintain appropriate professional insurance coverage</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.2 Content Standards</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Training content must be accurate and professionally relevant</li>
                  <li>No content promoting unsafe or illegal practices</li>
                  <li>Respect intellectual property rights of others</li>
                  <li>Social media posts must comply with community guidelines</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.3 Australian Legal Compliance</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Comply with Fair Work Act 2009 for employment relationships</li>
                  <li>Follow Australian Consumer Law for all transactions</li>
                  <li>Adhere to Privacy Act 1988 when handling personal information</li>
                  <li>Meet taxation obligations including GST where applicable</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Payment Terms */}
          <Card>
            <CardHeader>
              <CardTitle>4. Payment Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">4.1 Platform Fees</h4>
                <p>
                  Snipshift charges a platform fee of 10% on all paid transactions, including:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Training content purchases</li>
                  <li>Premium subscription services</li>
                  <li>Featured listing upgrades</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4.2 Escrow System</h4>
                <p>
                  Payments for training content are held in escrow until content access is confirmed. 
                  Funds are released to trainers within 24 hours of successful content delivery.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4.3 Refunds</h4>
                <p>
                  Refunds are available within 7 days of purchase for training content that doesn't 
                  meet advertised standards, subject to our refund policy.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle>5. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">5.1 Platform Content</h4>
                <p>
                  The Snipshift platform, including design, software, and branding, is owned by 
                  Snipshift and protected by Australian and international copyright laws.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5.2 User Content</h4>
                <p>
                  Users retain ownership of their original content but grant Snipshift a 
                  non-exclusive license to use, display, and distribute content on the Platform 
                  for business purposes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                6. Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="text-yellow-800 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">6.1 Platform Role</h4>
                <p>
                  Snipshift operates as a marketplace platform connecting users. We are not 
                  responsible for the quality, safety, or legality of services provided by users.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6.2 Liability Limits</h4>
                <p>
                  Our total liability to any user is limited to the amount of fees paid to 
                  Snipshift in the 12 months preceding the claim, subject to Australian Consumer Law.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6.3 User Interactions</h4>
                <p>
                  Users interact with each other independently. Snipshift is not liable for 
                  disputes, injuries, or damages arising from user interactions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dispute Resolution */}
          <Card>
            <CardHeader>
              <CardTitle>7. Dispute Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">7.1 Internal Process</h4>
                <p>
                  Disputes should first be reported through our platform's dispute resolution 
                  system. We will mediate in good faith to reach a fair resolution.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">7.2 External Resolution</h4>
                <p>
                  If internal resolution fails, disputes may be referred to the Australian 
                  Financial Complaints Authority (AFCA) or resolved through Australian courts 
                  under New South Wales law.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>8. Account Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">8.1 Voluntary Termination</h4>
                <p>
                  Users may terminate their account at any time through account settings. 
                  Outstanding payments and obligations remain valid.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">8.2 Platform Termination</h4>
                <p>
                  We may suspend or terminate accounts for violations of these terms, illegal 
                  activity, or platform abuse, with appropriate notice where required by law.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardHeader>
              <CardTitle>9. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                We may update these terms occasionally to reflect changes in our services or 
                legal requirements. Users will be notified of significant changes via email 
                and platform notifications at least 30 days before they take effect.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Shield className="h-5 w-5 mr-2" />
                10. Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-green-800">
              <p className="mb-2">
                <strong>Snipshift Platform</strong><br />
                Australia<br />
                Email: legal@snipshift.com.au<br />
                Website: www.snipshift.com.au
              </p>
              <p className="text-sm">
                For disputes: disputes@snipshift.com.au<br />
                For privacy concerns: privacy@snipshift.com.au
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Footer */}
        <div className="text-center text-sm text-neutral-600">
          <p>
            These Terms of Service are governed by Australian law and subject to the 
            jurisdiction of Australian courts.
          </p>
          <p className="mt-2">
            Last updated: September 2025 | Effective immediately for new users
          </p>
        </div>
      </div>
    </div>
  );
}