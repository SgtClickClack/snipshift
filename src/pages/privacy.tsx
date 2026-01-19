import { SEO } from '@/components/seo/SEO';
import { Card, CardContent } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <>
      <SEO
        title="Privacy Policy"
        description="HospoGo Privacy Policy - Learn how we collect, use, and protect your personal information in accordance with Australian Privacy Principles."
        url="/privacy"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="card-chrome">
            <CardContent className="prose prose-slate max-w-none p-8 md:p-12">
              <h1 className="text-4xl font-bold text-steel-900 mb-2">HospoGo Privacy Policy</h1>
              <p className="text-sm text-steel-600 mb-8">Last Updated: January 17, 2026</p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">1. Introduction</h2>
                <p className="text-steel-700 mb-4">
                  HospoGo ("we," "us," or "our") is committed to protecting the privacy of our users. This policy outlines how we handle your Personal Information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">2. Data Collection and Usage</h2>
                <p className="text-steel-700 mb-4">
                  We collect information necessary to facilitate real-time shift matching and marketplace security:
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2 ml-4">
                  <li><strong>Professionals:</strong> Name, contact details, profile imagery, and geofenced attendance logs.</li>
                  <li><strong>Venues:</strong> Business details, shift requirements, and financial transaction history.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">3. Data Retention (The 7-Year Rule)</h2>
                <p className="text-steel-700 mb-4">
                  To comply with Australian employment and financial record-keeping laws, we retain active data for a minimum of seven years.
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2 ml-4">
                  <li><strong>Soft Deletion:</strong> When you cancel a shift or close your account, your data is "soft-deleted" (marked as inactive) but preserved for legal reporting.</li>
                  <li><strong>Permanent Purging:</strong> Records that have been inactive or soft-deleted for more than seven years are permanently hard-deleted from our systems to minimize your data footprint.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">4. Your Right to Data Access and Export</h2>
                <p className="text-steel-700 mb-4">
                  Under APP 12, you have a right to access the personal information we hold about you.
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2 ml-4">
                  <li><strong>Data Export:</strong> You may request a structured export of your digital footprint. Our system generates a report with your profile, shift history, application status, and communication logs.</li>
                  <li><strong>Requests:</strong> Please contact <a href="mailto:info@hospogo.com" className="text-brand-neon hover:underline">info@hospogo.com</a> to initiate a data export.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">5. Security and Logging</h2>
                <p className="text-steel-700 mb-4">
                  We implement industry-standard security to protect your PII (Personally Identifiable Information):
                </p>
                <ul className="list-disc list-inside text-steel-700 mb-4 space-y-2 ml-4">
                  <li><strong>Encryption:</strong> Sensitive data is encrypted at rest in our production database.</li>
                  <li><strong>Redaction:</strong> We actively audit our system logs to redact PII, ensuring that sensitive details like email addresses are not stored in plain-text monitoring tools.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">6. Contact Us</h2>
                <p className="text-steel-700 mb-4">
                  For any questions regarding your data or to exercise your right to access, please contact:
                </p>
                <p className="text-steel-700">
                  <a href="mailto:info@hospogo.com" className="text-brand-neon hover:underline font-semibold">info@hospogo.com</a>
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
