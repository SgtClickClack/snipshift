/**
 * PartnerTrustBar – Trust signals using Xero and Stripe branding.
 *
 * Compliance: Uses "Works with Xero" / "Integrated with Xero" and "Payments powered by Stripe"
 * language. Logos link to tooltips explaining usage. Do not imply formal partnership/endorsement.
 *
 * Logo assets: Replace placeholder paths with official downloads from:
 * - Xero: https://www.xero.com/us/media/downloads/
 * - Stripe: https://stripe.com/newsroom/brand-assets
 */

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type PartnerTrustBarVariant = "hero" | "footer";

/** Minimal placeholder SVGs (replace with official assets from brand galleries) */
const XERO_LOGO_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 24' fill='none'%3E%3Ctext x='0' y='18' font-family='system-ui' font-size='16' font-weight='600' fill='%2313B5EA'%3EXero%3C/text%3E%3C/svg%3E";
const STRIPE_LOGO_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 24' fill='none'%3E%3Ctext x='0' y='18' font-family='system-ui' font-size='16' font-weight='600' fill='%23635BFF'%3EStripe%3C/text%3E%3C/svg%3E";

const PARTNERS = [
  {
    id: "xero",
    name: "Xero",
    logoPath: "/logos/xero-logo.svg",
    logoFallback: XERO_LOGO_SVG,
    tooltip: "Secure automated payroll sync. Connect your Xero account to sync timesheets and streamline back-office workflows.",
    href: "https://www.xero.com",
    label: "Works with Xero",
  },
  {
    id: "stripe",
    name: "Stripe",
    logoPath: "/logos/stripe-badge.svg",
    logoFallback: STRIPE_LOGO_SVG,
    tooltip: "PCI-compliant payment processing. Stripe powers secure payments for venues and guaranteed payouts for staff.",
    href: "https://stripe.com",
    label: "Payments powered by Stripe",
  },
] as const;

interface PartnerTrustBarProps {
  variant?: PartnerTrustBarVariant;
  className?: string;
}

export function PartnerTrustBar({ variant = "footer", className }: PartnerTrustBarProps) {
  const isFooter = variant === "footer";

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-6 md:gap-10",
          className
        )}
      >
        <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
          {isFooter ? "Integrated with" : "Seamlessly integrates with"}
        </span>
        <div className="flex items-center gap-6 md:gap-10">
          {PARTNERS.map((partner) => (
            <Tooltip key={partner.id}>
              <TooltipTrigger asChild>
                <a
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#BAFF39]/50 focus:ring-offset-2 focus:ring-offset-transparent rounded",
                    isFooter && "grayscale opacity-70 hover:opacity-90"
                  )}
                  aria-label={partner.label}
                >
                  <img
                    src={partner.logoPath}
                    alt=""
                    className="h-6 md:h-7 w-auto object-contain"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== partner.logoFallback) img.src = partner.logoFallback;
                    }}
                  />
                </a>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[260px] text-center"
              >
                <p className="font-medium text-foreground">{partner.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {partner.tooltip}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
