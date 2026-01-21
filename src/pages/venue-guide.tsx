import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, CheckCircle2, Star, Shield, Zap, Cloud } from "lucide-react";
import { SEO } from "@/components/seo/SEO";

export default function VenueGuide() {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };

  return (
    <>
      <SEO
        title="Venue Launch Kit | HospoGo"
        description="Your complete guide to getting started with HospoGo. Post shifts, understand ratings, and automate payments."
      />
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8 print:mb-4">
            <div className="flex items-center justify-center gap-3 mb-4 print:mb-2">
              <div className="w-12 h-12 bg-steel-600 rounded-lg flex items-center justify-center print:w-10 print:h-10">
                <span className="text-white font-bold text-xl print:text-lg">HG</span>
              </div>
              <h1 className="text-4xl font-bold text-white print:text-3xl print:text-black">HospoGo</h1>
            </div>
            <p className="text-xl text-gray-300 print:text-lg print:text-gray-700">
              Venue Launch Kit
            </p>
            <p className="text-sm text-gray-400 mt-2 print:text-xs print:text-gray-600">
              Everything you need to get your floor covered
            </p>
          </div>

          {/* Print Button */}
          <div className="flex justify-end mb-6 print:hidden">
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-steel-600 hover:bg-steel-700 text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              {isPrinting ? "Printing..." : "Print Guide"}
            </Button>
          </div>

          {/* Section 1: Quick Start */}
          <Card className="mb-6 print:mb-4 print:shadow-none print:border print:border-gray-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-steel-600 rounded-full flex items-center justify-center print:w-8 print:h-8">
                  <Zap className="h-5 w-5 text-white print:h-4 print:w-4" />
                </div>
                <div>
                  <CardTitle className="text-2xl print:text-xl print:text-black">Quick Start</CardTitle>
                  <CardDescription className="print:text-gray-700">
                    Post your first shift in under 60 seconds
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 print:space-y-3">
              <div className="space-y-3 print:space-y-2">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-steel-600 text-white rounded-full flex items-center justify-center font-bold print:w-6 print:h-6 print:text-sm print:bg-gray-800 print:text-white">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2 print:text-black">Open your calendar</h3>
                    <p className="text-gray-300 print:text-gray-700">
                      Click the calendar icon in your dashboard. You'll see your schedule for the week ahead.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-steel-600 text-white rounded-full flex items-center justify-center font-bold print:w-6 print:h-6 print:text-sm print:bg-gray-800 print:text-white">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2 print:text-black">Click "Create Shift"</h3>
                    <p className="text-gray-300 print:text-gray-700">
                      Pick the date and time slot you need covered. The form auto-saves as you type, so you won't lose your work.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-steel-600 text-white rounded-full flex items-center justify-center font-bold print:w-6 print:h-6 print:text-sm print:bg-gray-800 print:text-white">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2 print:text-black">Fill in the basics</h3>
                    <p className="text-gray-300 print:text-gray-700">
                      Choose the role (bartender, waitstaff, etc.), set your hourly rate, and add any notes. That's it.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-steel-600 text-white rounded-full flex items-center justify-center font-bold print:w-6 print:h-6 print:text-sm print:bg-gray-800 print:text-white">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2 print:text-black">Post and wait</h3>
                    <p className="text-gray-300 print:text-gray-700">
                      Hit "Create Shift" and your shift goes live. Experienced professionals will see it immediately and can apply or accept.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-steel-900/50 rounded-lg border-2 border-steel-600/60 print:bg-gray-100 print:border-gray-400 print:border-2">
                <p className="text-sm text-gray-300 print:text-gray-700">
                  <strong className="text-white print:text-black">Pro tip:</strong> Set up recurring shifts for the same time each week. Saves you hours every month.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: The Trust Engine */}
          <Card className="mb-6 print:mb-4 print:shadow-none print:border print:border-gray-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-steel-600 rounded-full flex items-center justify-center print:w-8 print:h-8">
                  <Shield className="h-5 w-5 text-white print:h-4 print:w-4" />
                </div>
                <div>
                  <CardTitle className="text-2xl print:text-xl print:text-black">The Trust Engine</CardTitle>
                  <CardDescription className="print:text-gray-700">
                    How we keep your floor staffed with reliable people
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 print:space-y-3">
              <div className="space-y-4 print:space-y-3">
                <div>
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2 print:text-black">
                    <Star className="h-5 w-5 text-yellow-400 print:h-4 print:w-4" />
                    Star Ratings
                  </h3>
                  <p className="text-gray-300 print:text-gray-700">
                    After every shift, you rate the staff member. They rate you too. It's honest feedback that helps everyone improve.
                  </p>
                  <p className="text-gray-300 mt-2 print:text-gray-700">
                    Staff with 4.5 stars or higher get a "Top Rated" badge. You'll see it on their profile.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2 print:text-black">
                    <CheckCircle2 className="h-5 w-5 text-green-400 print:h-4 print:w-4" />
                    Reliability Strikes
                  </h3>
                  <p className="text-gray-300 print:text-gray-700">
                    If someone doesn't show up or cancels last minute, they get a strike. Three strikes and they're suspended for 48 hours.
                  </p>
                  <p className="text-gray-300 mt-2 print:text-gray-700">
                    The good news? They can work their way back. Five shifts with a 4.5+ rating removes one strike. It's fair, and it works.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2 print:text-black">What This Means For You</h3>
                  <p className="text-gray-300 print:text-gray-700">
                    You're not hiring blind. Every person on HospoGo has a track record you can see. Check their profile before you invite them.
                  </p>
                  <p className="text-gray-300 mt-2 print:text-gray-700">
                    We filter out the time-wasters so you don't have to. Good staff rise to the top. Your floor stays covered.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Automated Payments */}
          <Card className="mb-6 print:mb-4 print:shadow-none print:border print:border-gray-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-steel-600 rounded-full flex items-center justify-center print:w-8 print:h-8">
                  <Zap className="h-5 w-5 text-white print:h-4 print:w-4" />
                </div>
                <div>
                  <CardTitle className="text-2xl print:text-xl print:text-black">Automated Payments</CardTitle>
                  <CardDescription className="print:text-gray-700">
                    Stripe handles everything. You don't lift a finger.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 print:space-y-3">
              <div className="space-y-3 print:space-y-2">
                <p className="text-gray-300 print:text-gray-700">
                  When you post a shift, we hold the payment in Stripe. The moment the shift ends and you mark it complete, the money goes straight to the staff member's bank account.
                </p>

                <div className="space-y-2 print:space-y-1">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0 print:h-4 print:w-4" />
                    <p className="text-gray-300 print:text-gray-700">
                      <strong className="text-white print:text-black">No invoices.</strong> No chasing people for bank details. No manual transfers.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0 print:h-4 print:w-4" />
                    <p className="text-gray-300 print:text-gray-700">
                      <strong className="text-white print:text-black">Instant payouts.</strong> Staff get paid the same day. Happy staff, less turnover.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0 print:h-4 print:w-4" />
                    <p className="text-gray-300 print:text-gray-700">
                      <strong className="text-white print:text-black">Protected.</strong> Stripe handles all the security. Your card details are never stored on our servers.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-steel-900/50 rounded-lg border-2 border-steel-600/60 print:bg-gray-100 print:border-gray-400 print:border-2">
                  <p className="text-sm text-gray-300 print:text-gray-700">
                    <strong className="text-white print:text-black">First time setup:</strong> You'll add a payment method once (secure Stripe card setup). Takes about 2 minutes. After that, it's automatic.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Persistent State Note */}
          <Card className="mb-6 print:mb-4 print:shadow-none print:border print:border-gray-300 print:bg-gray-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Cloud className="h-5 w-5 text-steel-400 mt-0.5 flex-shrink-0 print:h-4 print:w-4 print:text-gray-600" />
                <div>
                  <p className="text-sm text-gray-300 print:text-gray-700">
                    <strong className="text-white print:text-black">Your drafts and settings are saved to the cloud automatically.</strong> Switch between your office laptop and floor tablet without losing a second.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 print:mt-4 print:border-t print:border-gray-300 print:pt-4 print:hidden">
            <p className="text-sm text-gray-400 print:text-gray-600">
              Questions? Hit us up at info@hospogo.com
            </p>
            <p className="text-xs text-gray-500 mt-2 print:text-gray-500">
              Built in Brisbane, for Brisbane venues.
            </p>
            <p className="text-xs text-gray-500 mt-1 print:text-gray-500">
              Last Updated: Jan 2026
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }

          body {
            background: white;
            color: black;
          }

          /* Hide navbar and navigation elements */
          nav,
          header,
          [role="navigation"],
          .navbar,
          nav[class*="navbar"],
          header[class*="navbar"] {
            display: none !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:mb-2 {
            margin-bottom: 0.5rem;
          }

          .print\\:mb-4 {
            margin-bottom: 1rem;
          }

          .print\\:text-xl {
            font-size: 1.25rem;
          }

          .print\\:text-lg {
            font-size: 1.125rem;
          }

          .print\\:text-xs {
            font-size: 0.75rem;
          }

          .print\\:text-3xl {
            font-size: 1.875rem;
          }

          .print\\:w-10 {
            width: 2.5rem;
          }

          .print\\:h-10 {
            height: 2.5rem;
          }

          .print\\:w-8 {
            width: 2rem;
          }

          .print\\:h-8 {
            height: 2rem;
          }

          .print\\:w-6 {
            width: 1.5rem;
          }

          .print\\:h-6 {
            height: 1.5rem;
          }

          .print\\:h-4 {
            height: 1rem;
          }

          .print\\:w-4 {
            width: 1rem;
          }

          .print\\:text-sm {
            font-size: 0.875rem;
          }

          .print\\:text-black {
            color: black;
          }

          .print\\:text-gray-700 {
            color: #374151;
          }

          .print\\:text-gray-600 {
            color: #4b5563;
          }

          .print\\:text-gray-500 {
            color: #6b7280;
          }

          .print\\:bg-gray-100 {
            background-color: #f3f4f6;
          }

          .print\\:bg-gray-50 {
            background-color: #f9fafb;
          }

          .print\\:bg-gray-800 {
            background-color: #1f2937;
          }

          .print\\:text-white {
            color: white;
          }

          .print\\:border {
            border-width: 1px;
          }

          .print\\:border-gray-300 {
            border-color: #d1d5db;
          }

          .print\\:shadow-none {
            box-shadow: none;
          }

          .print\\:space-y-3 {
            margin-top: 0.75rem;
          }

          .print\\:space-y-2 {
            margin-top: 0.5rem;
          }

          .print\\:space-y-1 {
            margin-top: 0.25rem;
          }

          .print\\:pt-4 {
            padding-top: 1rem;
          }

          .print\\:mt-4 {
            margin-top: 1rem;
          }

          .min-h-screen {
            min-height: auto;
          }

          .bg-gradient-to-b {
            background: white;
          }

          .container {
            max-width: 100%;
            padding: 0;
          }

          .px-4 {
            padding-left: 0;
            padding-right: 0;
          }

          .py-8 {
            padding-top: 0;
            padding-bottom: 0;
          }

          .max-w-4xl {
            max-width: 100%;
          }

          .mb-6 {
            margin-bottom: 1.5rem;
          }

          .mb-8 {
            margin-bottom: 2rem;
          }

          .mt-8 {
            margin-top: 2rem;
          }

          .mt-2 {
            margin-top: 0.5rem;
          }

          .mt-4 {
            margin-top: 1rem;
          }

          .mt-6 {
            margin-top: 1.5rem;
          }

          .p-4 {
            padding: 1rem;
          }

          .pt-6 {
            padding-top: 1.5rem;
          }

          .gap-3 {
            gap: 0.75rem;
          }

          .gap-4 {
            gap: 1rem;
          }

          .gap-2 {
            gap: 0.5rem;
          }

          .space-y-4 > * + * {
            margin-top: 1rem;
          }

          .space-y-3 > * + * {
            margin-top: 0.75rem;
          }

          .space-y-2 > * + * {
            margin-top: 0.5rem;
          }

          .space-y-1 > * + * {
            margin-top: 0.25rem;
          }

          .rounded-lg {
            border-radius: 0.5rem;
          }

          .rounded-full {
            border-radius: 9999px;
          }

          .flex {
            display: flex;
          }

          .items-center {
            align-items: center;
          }

          .items-start {
            align-items: flex-start;
          }

          .justify-center {
            justify-content: center;
          }

          .justify-end {
            justify-content: flex-end;
          }

          .text-center {
            text-align: center;
          }

          .flex-shrink-0 {
            flex-shrink: 0;
          }

          .flex-1 {
            flex: 1 1 0%;
          }

          .font-bold {
            font-weight: 700;
          }

          .font-semibold {
            font-weight: 600;
          }

          .text-4xl {
            font-size: 2.25rem;
          }

          .text-2xl {
            font-size: 1.5rem;
          }

          .text-xl {
            font-size: 1.25rem;
          }

          .text-sm {
            font-size: 0.875rem;
          }

          .text-xs {
            font-size: 0.75rem;
          }

          .mb-2 {
            margin-bottom: 0.5rem;
          }

          .mb-4 {
            margin-bottom: 1rem;
          }

          .mt-0\\.5 {
            margin-top: 0.125rem;
          }
        }
      `}</style>
    </>
  );
}
