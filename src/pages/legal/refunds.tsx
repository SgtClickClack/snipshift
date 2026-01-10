import { SEO } from '@/components/seo/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function RefundsPage() {
  return (
    <>
      <SEO
        title="Refund & Dispute Policy"
        description="HospoGo Refund & Dispute Policy - cancellation rules, refunds, and dispute timeframes."
        url="/refunds"
      />

      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> This policy is provided for informational purposes only and may not be suitable for your
              business or jurisdiction. Please consult a qualified legal professional before relying on it.
            </AlertDescription>
          </Alert>

          <Card className="card-chrome">
            <CardContent className="prose prose-slate max-w-none p-8">
              <h1 className="text-3xl font-bold text-steel-900 mb-2">Refund &amp; Dispute Policy</h1>
              <p className="text-sm text-steel-600 mb-8">
                Last updated:{' '}
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">1. Scope</h2>
                <p className="text-steel-700 mb-4">
                  This page describes HospoGo’s approach to cancellations, refunds, and disputes for shifts booked through the Platform.
                  It should be read together with the Terms of Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">2. Venue Cancellations</h2>
                <h3 className="text-xl font-semibold text-steel-800 mb-3">2.1 Cancellation window</h3>
                <p className="text-steel-700 mb-4">
                  Unless a Shift shows a different window, HospoGo uses a <strong>24-hour cancellation window</strong>.
                </p>

                <h3 className="text-xl font-semibold text-steel-800 mb-3">2.2 Late cancellations (Kill Fee)</h3>
                <p className="text-steel-700 mb-4">
                  If a Venue cancels within the applicable cancellation window, HospoGo may require the Venue to pay a{' '}
                  <strong>Kill Fee</strong> to compensate Staff. Where applicable, the Kill Fee amount will be shown on the Shift.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">3. Staff Cancellations</h2>
                <p className="text-steel-700 mb-4">
                  If Staff cancels a Shift, HospoGo may republish the Shift to help the Venue find a replacement. If the cancellation is
                  late (within the applicable cancellation window), HospoGo may republish the Shift as an <strong>Emergency Fill</strong>{' '}
                  and may apply platform enforcement (for example, a reliability strike) as described in the Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">4. No-shows and Disputes</h2>
                <p className="text-steel-700 mb-4">
                  No-shows are taken seriously. If a Venue reports a Staff no-show, HospoGo may restrict accounts and may facilitate
                  dispute handling. Payment holds, reversals, or refunds (if any) depend on the facts, platform rules, and payment
                  processor constraints.
                </p>
                <p className="text-steel-700 mb-4">
                  If you need to raise a dispute, please contact support as soon as possible with the Shift ID and supporting details.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-steel-900 mb-4">5. Support</h2>
                <p className="text-steel-700 mb-4">
                  For refunds, disputes, or policy questions, contact:
                </p>
                <p className="text-steel-700">
                  <strong>Email:</strong> info@hospogo.com
                  <br />
                  <strong>Phone:</strong> +61 478 430 822
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

