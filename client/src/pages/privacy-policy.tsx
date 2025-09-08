import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, Eye, Database, AlertTriangle, CheckCircle } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-green-600 mr-3" />
            <h1 className="text-4xl font-bold text-neutral-900">Privacy Policy</h1>
          </div>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Your privacy is important to us. This policy explains how Snipshift collects, 
            uses, and protects your personal information in compliance with Australian privacy laws.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline">Effective: September 2025</Badge>
            <Badge variant="outline">Version 1.0</Badge>
            <Badge className="bg-green-600">Privacy Act 1988 Compliant</Badge>
          </div>
        </div>

        <div className="space-y-6">
          {/* Privacy Summary */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Privacy Commitment:</strong> We collect only necessary information to provide 
              our services, never sell personal data, and give you control over your information. 
              All data is stored securely in Australia and processed according to Australian privacy laws.
            </AlertDescription>
          </Alert>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-600" />
                1. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1.1 Account Information</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Name, email address, and phone number</li>
                  <li>Professional role (Hub Owner, Professional, Brand, Trainer)</li>
                  <li>Business name and location details</li>
                  <li>Professional licenses and certifications</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">1.2 Profile Information</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Bio, skills, and experience details</li>
                  <li>Portfolio images and work samples</li>
                  <li>Location and availability preferences</li>
                  <li>Insurance and certification status</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">1.3 Platform Activity</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Job applications and shift bookings</li>
                  <li>Training content purchases and progress</li>
                  <li>Social feed interactions and messaging</li>
                  <li>Payment transaction history</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">1.4 Technical Information</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Device information and browser type</li>
                  <li>IP address and location data (for job matching)</li>
                  <li>Usage analytics and performance metrics</li>
                  <li>Login timestamps and security logs</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2 text-purple-600" />
                2. How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">2.1 Core Platform Services</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Creating and managing your account</li>
                  <li>Matching professionals with job opportunities</li>
                  <li>Processing payments and training content sales</li>
                  <li>Facilitating messaging between users</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2.2 Communication</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sending job notifications and platform updates</li>
                  <li>Customer support and dispute resolution</li>
                  <li>Marketing communications (with your consent)</li>
                  <li>Important policy and security notifications</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2.3 Platform Improvement</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Analyzing usage patterns to improve features</li>
                  <li>Personalizing job recommendations</li>
                  <li>Detecting fraud and ensuring platform security</li>
                  <li>Compliance with legal and regulatory requirements</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card>
            <CardHeader>
              <CardTitle>3. Information Sharing and Disclosure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">3.1 Within the Platform</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Profile information visible to relevant users (employers, trainers)</li>
                  <li>Job application details shared with hiring businesses</li>
                  <li>Training content progress visible to content creators</li>
                  <li>Public social feed posts and professional achievements</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.2 Service Providers</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Stripe for payment processing (with appropriate safeguards)</li>
                  <li>Google Maps for location services</li>
                  <li>Email service providers for notifications</li>
                  <li>Cloud hosting providers for data storage</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.3 Legal Requirements</h4>
                <p>
                  We may disclose information when required by law, such as:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Court orders or government investigations</li>
                  <li>Tax reporting obligations</li>
                  <li>Workplace safety incident reporting</li>
                  <li>Anti-money laundering compliance</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <Lock className="h-5 w-5 mr-2" />
                4. Data Security and Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">4.1 Security Measures</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>256-bit SSL encryption for all data transmission</li>
                  <li>Encrypted database storage with access controls</li>
                  <li>Regular security audits and vulnerability testing</li>
                  <li>Multi-factor authentication for sensitive accounts</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4.2 Data Location</h4>
                <p>
                  All personal information is stored on secure servers located in Australia, 
                  ensuring compliance with Australian data sovereignty requirements.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4.3 Data Retention</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Account data: Retained for 7 years after account closure</li>
                  <li>Transaction records: Retained for 7 years (tax law requirement)</li>
                  <li>Communication logs: Retained for 2 years</li>
                  <li>Analytics data: Anonymized after 12 months</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle>5. Your Privacy Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">5.1 Access and Correction</h4>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Access all personal information we hold about you</li>
                  <li>Correct inaccurate or outdated information</li>
                  <li>Update your preferences and profile details</li>
                  <li>Download your data in a portable format</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5.2 Communication Preferences</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Opt out of marketing communications at any time</li>
                  <li>Choose notification frequency and types</li>
                  <li>Manage email and SMS preferences separately</li>
                  <li>Essential service communications cannot be disabled</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5.3 Account Deletion</h4>
                <p>
                  You can request account deletion at any time. We will:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Delete your profile and personal information</li>
                  <li>Anonymize transaction and communication records</li>
                  <li>Retain anonymized data for legal and business purposes</li>
                  <li>Process deletion requests within 30 days</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Cookies and Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>6. Cookies and Tracking Technologies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">6.1 Essential Cookies</h4>
                <p>Required for platform functionality:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Authentication and session management</li>
                  <li>Security and fraud prevention</li>
                  <li>Core platform features and navigation</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6.2 Analytics Cookies</h4>
                <p>Help us understand platform usage (optional):</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Page views and user journey tracking</li>
                  <li>Feature usage and performance metrics</li>
                  <li>Error reporting and debugging information</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6.3 Marketing Cookies</h4>
                <p>Used with your consent for:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Targeted advertising and content personalization</li>
                  <li>Social media integration</li>
                  <li>Marketing campaign effectiveness</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Third-Party Integrations */}
          <Card>
            <CardHeader>
              <CardTitle>7. Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">7.1 Payment Processing</h4>
                <p>
                  Stripe processes payments on our behalf and is subject to their own privacy 
                  policy. We share only necessary transaction information with Stripe.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">7.2 Google Services</h4>
                <p>
                  We use Google Maps for location services and Google OAuth for authentication. 
                  These services are governed by Google's privacy policy.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">7.3 Insurance Partners</h4>
                <p>
                  When you request insurance quotes, we share relevant information with our 
                  partner "Get Insured" to provide accurate quotes and coverage options.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Updates and Notifications */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                8. Policy Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="text-yellow-800">
              <p>
                We may update this privacy policy to reflect changes in our practices or legal 
                requirements. Significant changes will be communicated via email and platform 
                notifications at least 30 days before taking effect.
              </p>
              <p className="mt-2">
                Continued use of the platform after policy updates constitutes acceptance of 
                the new terms.
              </p>
            </CardContent>
          </Card>

          {/* Contact and Complaints */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Shield className="h-5 w-5 mr-2" />
                9. Contact Information and Complaints
              </CardTitle>
            </CardHeader>
            <CardContent className="text-green-800 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Privacy Inquiries</h4>
                <p>
                  <strong>Email:</strong> privacy@snipshift.com.au<br />
                  <strong>Response Time:</strong> Within 5 business days<br />
                  <strong>Mail:</strong> Privacy Officer, Snipshift, Australia
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">External Complaints</h4>
                <p>
                  If you're not satisfied with our response, you can lodge a complaint with 
                  the Office of the Australian Information Commissioner (OAIC):
                </p>
                <p className="mt-1">
                  <strong>Website:</strong> www.oaic.gov.au<br />
                  <strong>Phone:</strong> 1300 363 992<br />
                  <strong>Email:</strong> enquiries@oaic.gov.au
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Footer */}
        <div className="text-center text-sm text-neutral-600">
          <p>
            This Privacy Policy complies with the Privacy Act 1988 (Commonwealth) and 
            Australian Privacy Principles (APPs).
          </p>
          <p className="mt-2">
            Last updated: September 2025 | Effective immediately for new users
          </p>
        </div>
      </div>
    </div>
  );
}