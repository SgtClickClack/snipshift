import { SEO } from '@/components/seo/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function TermsPage() {
  return (
    <>
      <SEO
        title="Terms of Service"
        description="HospoGo Terms of Service - Read our terms and conditions for using our marketplace platform."
        url="/terms"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Disclaimer Banner */}
          <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> These Terms are provided for informational purposes only and may not be suitable for
              your business or jurisdiction. Please consult a qualified legal professional before relying on them.
            </AlertDescription>
          </Alert>

          <Card className="card-chrome">
            <CardContent className="prose prose-slate max-w-none p-8">
              <h1 className="text-3xl font-bold text-steel-900 mb-2">Terms of Service</h1>
              <p className="text-sm text-steel-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-steel-700 mb-4">
                  By accessing and using HospoGo ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">2. Marketplace Model</h2>
                <p className="text-steel-700 mb-4">
                  HospoGo operates as a marketplace platform that connects hospitality venues with staff for flexible shift work.
                  The Platform helps venues post shifts and enables staff to discover, accept, and complete shifts.
                </p>
                <p className="text-steel-700 mb-4">
                  <strong>Important:</strong> HospoGo acts solely as an intermediary and technology platform. We are not an employer, employment agency, or staffing company. We do not employ professionals, set their work schedules, or control their work performance. The relationship between professionals and businesses is that of independent contractors or direct employment, as determined by the parties involved.
                </p>
                <p className="text-steel-700 mb-4">
                  For clarity in these Terms:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>
                    <strong>Venue</strong> means a business account that posts shifts (e.g., restaurant, bar, pub, cafe, hotel, event venue)
                    and may include authorized representatives managing the venue’s postings.
                  </li>
                  <li>
                    <strong>Staff</strong> means an individual account that applies for, accepts, or works shifts posted on the Platform.
                  </li>
                  <li>
                    <strong>Shift</strong> means a scheduled work opportunity posted by a Venue that may include role requirements
                    (e.g., uniform, expected pax, RSA/RCG where applicable), pay rate, start/end time, and cancellation terms.
                  </li>
                  <li>
                    <strong>Emergency Fill</strong> means a Shift republished with urgency (e.g., after a late cancellation) to help Venues
                    fill staffing gaps quickly.
                  </li>
                </ul>
                <p className="text-steel-700 mb-4">
                  HospoGo is not responsible for:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>The quality, safety, or legality of work opportunities posted by businesses</li>
                  <li>The conduct, qualifications, or performance of professionals or businesses</li>
                  <li>Employment relationships, tax obligations, or worker classification between users</li>
                  <li>Disputes between professionals and businesses regarding work performed</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">3. User Accounts</h2>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">3.1 Account Creation</h3>
                <p className="text-steel-700 mb-4">
                  To use certain features of the Platform, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">3.2 Account Security</h3>
                <p className="text-steel-700 mb-4">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify HospoGo immediately of any unauthorized use of your account.
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
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">5. Payment Terms</h2>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">5.1 Stripe Connect</h3>
                <p className="text-steel-700 mb-4">
                  HospoGo uses Stripe Connect to process payments between businesses and professionals. By using the Platform, you agree to Stripe's Terms of Service and Connected Account Agreement. All payment processing is handled securely through Stripe's infrastructure.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">5.2 Platform Fees</h3>
                <p className="text-steel-700 mb-4">
                  HospoGo charges a platform fee on transactions processed through the Platform. The current platform fee structure is:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>Platform fees are calculated as a percentage of the transaction amount</li>
                  <li>Fees are clearly disclosed before you confirm a booking or accept a shift</li>
                  <li>Platform fees are deducted from the payment before funds are transferred to professionals</li>
                  <li>Businesses pay the full agreed-upon rate; professionals receive the rate minus platform fees</li>
                </ul>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">5.3 Payout Schedule</h3>
                <p className="text-steel-700 mb-4">
                  Payouts to professionals are processed according to the following schedule:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>Payments are held in escrow until work is completed and verified</li>
                  <li>Standard payouts are processed within 2-3 business days after work completion</li>
                  <li>First-time payouts may be subject to additional verification and may take up to 7 business days</li>
                  <li>Payouts are transferred directly to the professional's connected Stripe account</li>
                  <li>Stripe may apply additional processing times based on your account status and location</li>
                </ul>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">5.4 Payment Disputes</h3>
                <p className="text-steel-700 mb-4">
                  Disputes regarding payment amounts, quality of work, or service delivery should be resolved directly between the business and professional. HospoGo may facilitate dispute resolution but is not obligated to intervene. In cases of fraud or violation of these Terms, HospoGo reserves the right to withhold payments pending investigation.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">5.5 Refunds</h3>
                <p className="text-steel-700 mb-4">
                  Refund policies vary by transaction type and are subject to the terms agreed upon between users. HospoGo reserves the right to issue refunds at its sole discretion in cases of fraud, technical errors, or other exceptional circumstances. Platform fees are generally non-refundable except in cases of platform error.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">6. Cancellations and No-Shows</h2>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">6.1 Cancellation Window (Default 24 Hours)</h3>
                <p className="text-steel-700 mb-4">
                  Unless otherwise shown on a Shift, HospoGo uses a <strong>24-hour cancellation window</strong>. This means a cancellation
                  is considered “late” if it occurs within 24 hours of the Shift’s start time. Some Shifts may specify a different cancellation
                  window, which will be displayed with the Shift details.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">6.2 Staff Late Cancellation (Reliability Strikes)</h3>
                <p className="text-steel-700 mb-4">
                  If Staff cancels a Shift within the applicable cancellation window, HospoGo may treat it as a late cancellation. Late
                  cancellations may trigger:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li><strong>Reliability Strike:</strong> a platform penalty recorded against the Staff account</li>
                  <li><strong>Emergency Fill:</strong> the Shift may be republished as an Emergency Fill to help the Venue replace the Staff member</li>
                  <li><strong>Account enforcement:</strong> repeated late cancellations may result in restrictions, suspension, or termination</li>
                </ul>
                <p className="text-steel-700 mb-4">
                  Reliability Strikes are intended to protect Venue operations and marketplace trust. HospoGo may automatically suspend
                  accounts that accumulate multiple strikes (for example, at <strong>three (3) strikes</strong>).
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">6.3 Venue Late Cancellation (Kill Fee)</h3>
                <p className="text-steel-700 mb-4">
                  Venues are expected to honor accepted Shifts. If a Venue cancels within the applicable cancellation window, HospoGo may
                  require the Venue to pay a <strong>Kill Fee</strong> to compensate Staff for the late cancellation.
                </p>
                <p className="text-steel-700 mb-4">
                  Where applicable, the Kill Fee amount (if any) will be shown on the Shift. HospoGo may collect the Kill Fee via the payment
                  method on file and remit it to Staff (less any applicable fees) or otherwise administer the payment as permitted by law and
                  platform policy. Not all Shifts may have a Kill Fee.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">6.4 No-Shows</h3>
                <p className="text-steel-700 mb-4">
                  No-shows (failure to appear for a scheduled shift without proper cancellation) are a serious violation of these Terms. Consequences for no-shows may include:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2">
                  <li>Immediate suspension of your account pending review</li>
                  <li>Permanent account termination for repeated violations</li>
                  <li>Financial penalties as determined by the affected business</li>
                  <li>Negative ratings and reviews that may impact future opportunities</li>
                </ul>
                <p className="text-steel-700 mb-4">
                  Businesses that repeatedly cancel shifts at the last minute or fail to honor commitments may also face account suspension or termination.
                </p>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">6.5 Emergency Cancellations</h3>
                <p className="text-steel-700 mb-4">
                  We understand that emergencies occur. If you need to cancel due to a genuine emergency, please contact the other party and HospoGo support as soon as possible. Emergency cancellations will be reviewed on a case-by-case basis and may not result in penalties if properly documented and communicated.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">7. Intellectual Property</h2>
                <p className="text-steel-700 mb-4">
                  The Platform and its original content, features, and functionality are owned by HospoGo and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works of any content from the Platform without express written permission.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">8. Limitation of Liability</h2>
                <p className="text-steel-700 mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOSPOGO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                </p>
                <p className="text-steel-700 mb-4">
                  HospoGo acts as a marketplace platform and is not responsible for the quality, safety, or legality of work opportunities posted by users, nor for the conduct of users on or off the Platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">9. Indemnification</h2>
                <p className="text-steel-700 mb-4">
                  You agree to indemnify, defend, and hold harmless HospoGo, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your use of the Platform or violation of these Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">10. Termination</h2>
                <p className="text-steel-700 mb-4">
                  HospoGo reserves the right to terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Platform will immediately cease.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">11. Changes to Terms</h2>
                <p className="text-steel-700 mb-4">
                  HospoGo reserves the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">12. Governing Law</h2>
                <p className="text-steel-700 mb-4">
                  These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which HospoGo operates, without regard to its conflict of law provisions.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">13. Contact Information</h2>
                <p className="text-steel-700 mb-4">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <p className="text-steel-700">
                  <strong>Email:</strong> legal@hospogo.com<br />
                  <strong>Business Name:</strong> HospoGo<br />
                  <strong>ABN:</strong> [INSERT_ABN]<br />
                  <strong>Registered Address:</strong> [INSERT_REGISTERED_ADDRESS]<br />
                  <strong>Address:</strong> HospoGo Legal Department
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

