import { SEO } from '@/components/seo/SEO';
import { Card, CardContent } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <>
      <SEO
        title="Terms of Service"
        description="SnipShift Terms of Service - Read our terms and conditions for using our marketplace platform."
        url="/terms"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="card-chrome">
            <CardContent className="prose prose-slate max-w-none p-8">
              <h1 className="text-3xl font-bold text-steel-900 mb-2">Terms of Service</h1>
              <p className="text-sm text-steel-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-steel-700 mb-4">
                  By accessing and using SnipShift ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">2. Description of Service</h2>
                <p className="text-steel-700 mb-4">
                  SnipShift is a marketplace platform that connects barbers, stylists, beauticians, and other professionals with flexible work opportunities. The Platform facilitates connections between professionals seeking work and businesses offering shifts, gigs, or employment opportunities.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">3. User Accounts</h2>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">3.1 Account Creation</h3>
                <p className="text-steel-700 mb-4">
                  To use certain features of the Platform, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">3.2 Account Security</h3>
                <p className="text-steel-700 mb-4">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify SnipShift immediately of any unauthorized use of your account.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">4. User Obligations</h2>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">4.1 Professional Conduct</h3>
                <p className="text-steel-700 mb-4">
                  You agree to use the Platform in a professional manner and in accordance with all applicable laws and regulations. You will not:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>Post false, misleading, or fraudulent information</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Violate any applicable local, state, national, or international law</li>
                  <li>Transmit any viruses, malware, or other harmful code</li>
                  <li>Attempt to gain unauthorized access to the Platform or other users' accounts</li>
                </ul>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">4.2 Content Responsibility</h3>
                <p className="text-steel-700 mb-4">
                  You are solely responsible for all content you post, upload, or transmit through the Platform. You represent and warrant that you own or have the necessary rights to all content you submit.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">5. Payments and Transactions</h2>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">5.1 Payment Processing</h3>
                <p className="text-steel-700 mb-4">
                  SnipShift uses third-party payment processors (including Stripe) to handle payments. By using the Platform, you agree to the terms and conditions of our payment processors. All payments are subject to processing fees as disclosed at the time of transaction.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">5.2 Refunds</h3>
                <p className="text-steel-700 mb-4">
                  Refund policies vary by transaction type and are subject to the terms agreed upon between users. SnipShift reserves the right to issue refunds at its sole discretion in cases of fraud, technical errors, or other exceptional circumstances.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">5.3 Subscription Fees</h3>
                <p className="text-steel-700 mb-4">
                  If you subscribe to a paid plan, you agree to pay all fees associated with your subscription. Subscriptions automatically renew unless cancelled. You may cancel your subscription at any time through your account settings.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">6. Intellectual Property</h2>
                <p className="text-steel-700 mb-4">
                  The Platform and its original content, features, and functionality are owned by SnipShift and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works of any content from the Platform without express written permission.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">7. Limitation of Liability</h2>
                <p className="text-steel-700 mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, SNIPSHIFT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                </p>
                <p className="text-steel-700 mb-4">
                  SnipShift acts as a marketplace platform and is not responsible for the quality, safety, or legality of work opportunities posted by users, nor for the conduct of users on or off the Platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">8. Indemnification</h2>
                <p className="text-steel-700 mb-4">
                  You agree to indemnify, defend, and hold harmless SnipShift, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your use of the Platform or violation of these Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">9. Termination</h2>
                <p className="text-steel-700 mb-4">
                  SnipShift reserves the right to terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Platform will immediately cease.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">10. Changes to Terms</h2>
                <p className="text-steel-700 mb-4">
                  SnipShift reserves the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">11. Governing Law</h2>
                <p className="text-steel-700 mb-4">
                  These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which SnipShift operates, without regard to its conflict of law provisions.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">12. Contact Information</h2>
                <p className="text-steel-700 mb-4">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <p className="text-steel-700">
                  <strong>Email:</strong> legal@snipshift.com<br />
                  <strong>Address:</strong> SnipShift Legal Department
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

