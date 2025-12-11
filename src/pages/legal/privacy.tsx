import { SEO } from '@/components/seo/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <>
      <SEO
        title="Privacy Policy"
        description="SnipShift Privacy Policy - Learn how we collect, use, and protect your personal information."
        url="/privacy"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Disclaimer Banner */}
          <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Legal Disclaimer:</strong> This is a template. Please consult a legal professional before live operation.
            </AlertDescription>
          </Alert>

          <Card className="card-chrome">
            <CardContent className="prose prose-slate max-w-none p-8">
              <h1 className="text-3xl font-bold text-steel-900 mb-2">Privacy Policy</h1>
              <p className="text-sm text-steel-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">1. Introduction</h2>
                <p className="text-steel-700 mb-4">
                  SnipShift ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our marketplace platform ("the Platform"). Please read this Privacy Policy carefully.
                </p>
                <p className="text-steel-700 mb-4">
                  By using the Platform, you consent to the data practices described in this policy. If you do not agree with the data practices described in this policy, you should not use the Platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">2. Data Collection</h2>
                <p className="text-steel-700 mb-4">
                  We collect the following categories of personal information when you use the Platform:
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">2.1 Personal Information</h3>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li><strong>Name:</strong> Your full name or display name as provided during account registration</li>
                  <li><strong>Email Address:</strong> Your email address used for account creation, authentication, and communications</li>
                  <li><strong>Location:</strong> Your city, state, or geographic location to facilitate job matching and local opportunities</li>
                  <li><strong>Phone Number:</strong> Contact number for account verification and communication purposes</li>
                  <li><strong>Profile Information:</strong> Profile photo, bio, skills, work experience, portfolio, and certifications</li>
                </ul>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">2.2 Payment Information</h3>
                <p className="text-steel-700 mb-4">
                  Payment information is collected and stored securely through Stripe Connect, our payment processor. This includes:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li><strong>Billing Address:</strong> Required for payment processing and tax purposes</li>
                  <li><strong>Payment Method Details:</strong> Credit card information, bank account details, or other payment methods (stored securely by Stripe, not on our servers)</li>
                  <li><strong>Transaction History:</strong> Records of payments, payouts, and financial transactions</li>
                  <li><strong>Tax Information:</strong> Tax identification numbers or other tax-related information as required by law</li>
                </ul>
                <p className="text-steel-700 mb-4">
                  <strong>Important:</strong> SnipShift does not store your full credit card numbers or sensitive payment details on our servers. All payment information is securely processed and stored by Stripe in accordance with PCI DSS compliance standards.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">2.3 Automatically Collected Information</h3>
                <p className="text-steel-700 mb-4">When you use the Platform, we automatically collect certain information, including:</p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent on pages, and click patterns</li>
                  <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers, and mobile network information</li>
                  <li><strong>Location Data:</strong> General location information based on IP address or GPS (with your permission)</li>
                  <li><strong>Cookies and Tracking Technologies:</strong> See Section 6 for details</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">3. How We Use Your Information</h2>
                <p className="text-steel-700 mb-4">We use the information we collect to:</p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>Provide, maintain, and improve the Platform</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices, updates, security alerts, and support messages</li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>Communicate with you about products, services, offers, and events</li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                  <li>Detect, prevent, and address technical issues and fraudulent activity</li>
                  <li>Personalize your experience and provide content and features relevant to your interests</li>
                  <li>Facilitate connections between professionals and businesses</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">4. Third-Parties</h2>
                <p className="text-steel-700 mb-4">
                  We share your information with the following third-party service providers to operate the Platform:
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">4.1 Stripe</h3>
                <p className="text-steel-700 mb-4">
                  <strong>Purpose:</strong> Payment processing and financial transactions
                </p>
                <p className="text-steel-700 mb-4">
                  Stripe Connect processes all payments between businesses and professionals on the Platform. When you connect a payment method or receive payments, your payment information is shared with Stripe. Stripe collects and processes:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>Payment method details (credit cards, bank accounts)</li>
                  <li>Billing and shipping addresses</li>
                  <li>Transaction history and financial records</li>
                  <li>Tax identification information</li>
                </ul>
                <p className="text-steel-700 mb-4">
                  For more information about Stripe's privacy practices, please visit: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-accent hover:underline">https://stripe.com/privacy</a>
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">4.2 Google Services</h3>
                <p className="text-steel-700 mb-4">
                  We use various Google services to enhance the Platform:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li><strong>Google Analytics:</strong> We use Google Analytics to understand how users interact with the Platform. Google Analytics collects usage data, device information, and IP addresses. For more information, visit: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-accent hover:underline">Google Privacy Policy</a></li>
                  <li><strong>Google Maps:</strong> We use Google Maps API to provide location services, address autocomplete, and mapping features. When you use location-based features, your location data may be shared with Google. For more information, visit: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-accent hover:underline">Google Privacy Policy</a></li>
                  <li><strong>Google OAuth:</strong> If you choose to sign in with Google, Google authenticates your identity and shares your basic profile information (name, email) with us.</li>
                </ul>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">4.3 Other Service Providers</h3>
                <p className="text-steel-700 mb-4">
                  We also share information with other third-party service providers who perform services on our behalf:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li><strong>Cloud Hosting:</strong> Vercel and other cloud providers host our Platform and may have access to your data as part of their hosting services</li>
                  <li><strong>Email Services:</strong> We use email service providers to send transactional emails, notifications, and marketing communications</li>
                  <li><strong>Customer Support:</strong> We may use third-party customer support tools that have access to your account information to assist with support requests</li>
                </ul>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">4.4 Public Profile Information</h3>
                <p className="text-steel-700 mb-4">
                  Your public profile information (name, photo, bio, skills, location) is visible to other users of the Platform to facilitate connections and job matching.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">4.5 Legal Requirements</h3>
                <p className="text-steel-700 mb-4">
                  We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">4.6 Business Transfers</h3>
                <p className="text-steel-700 mb-4">
                  If SnipShift is involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">5. Payment Processing and Stripe</h2>
                <p className="text-steel-700 mb-4">
                  SnipShift uses Stripe Connect to process all payments on the Platform. When you make or receive a payment:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>Your payment information is securely transmitted directly to Stripe</li>
                  <li>Stripe processes your payment in accordance with their Privacy Policy and Terms of Service</li>
                  <li>We do not store your full credit card details on our servers</li>
                  <li>Stripe may collect and use your payment information as described in their privacy policy</li>
                  <li>Stripe Connect enables direct payments between businesses and professionals</li>
                </ul>
                <p className="text-steel-700 mb-4">
                  For more information about Stripe's privacy practices, please visit: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-accent hover:underline">https://stripe.com/privacy</a>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">6. Cookies and Tracking Technologies</h2>
                <p className="text-steel-700 mb-4">
                  We use cookies and similar tracking technologies to track activity on the Platform and store certain information. Cookies are files with a small amount of data that may include an anonymous unique identifier.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">Types of Cookies We Use:</h3>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for the Platform to function properly</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the Platform</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                  <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
                </ul>
                <p className="text-steel-700 mb-4">
                  You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of the Platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">7. Data Security</h2>
                <p className="text-steel-700 mb-4">
                  We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
                <p className="text-steel-700 mb-4">
                  Security measures include encryption in transit (SSL/TLS), secure password storage, regular security audits, and access controls.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">8. Your Rights and Choices</h2>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">8.1 Access and Update</h3>
                <p className="text-steel-700 mb-4">
                  You can access and update your personal information at any time through your account settings.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">8.2 Deletion</h3>
                <p className="text-steel-700 mb-4">
                  You can request deletion of your account and personal information by contacting us. We will delete your information subject to legal retention requirements.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">8.3 GDPR Rights (EU Users)</h3>
                <p className="text-steel-700 mb-4">
                  If you are located in the European Economic Area (EEA), you have certain data protection rights, including:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>The right to access, update, or delete your personal information</li>
                  <li>The right to rectification</li>
                  <li>The right to object</li>
                  <li>The right to restriction of processing</li>
                  <li>The right to data portability</li>
                  <li>The right to withdraw consent</li>
                </ul>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">8.4 CCPA Rights (California Users)</h3>
                <p className="text-steel-700 mb-4">
                  If you are a California resident, you have the right to:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>Know what personal information is collected</li>
                  <li>Know whether your personal information is sold or disclosed</li>
                  <li>Opt-out of the sale of personal information</li>
                  <li>Access your personal information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Non-discrimination for exercising your privacy rights</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">9. Data Retention</h2>
                <p className="text-steel-700 mb-4">
                  We retain your personal information for as long as necessary to provide the Platform and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
                </p>
                <p className="text-steel-700 mb-4">
                  When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal, regulatory, or business purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">10. Children's Privacy</h2>
                <p className="text-steel-700 mb-4">
                  The Platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to delete such information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">11. International Data Transfers</h2>
                <p className="text-steel-700 mb-4">
                  Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. We take appropriate safeguards to ensure your information receives adequate protection.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">12. Changes to This Privacy Policy</h2>
                <p className="text-steel-700 mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">13. Contact Us</h2>
                <p className="text-steel-700 mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p className="text-steel-700">
                  <strong>Email:</strong> privacy@snipshift.com<br />
                  <strong>Address:</strong> SnipShift Privacy Department
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

