import { Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const tiers = [
    {
      name: "Professional",
      description: "For hospitality staff seeking flexibility.",
      price: "Free",
      duration: "Forever",
      subPrice: null,
      features: [
        "Keep 100% of your hourly rate",
        "Instant payouts available",
        "Build your digital reputation",
        "First access to high-paying shifts",
      ],
      cta: "Join as Pro",
      buttonVariant: "secondary" as const,
      highlighted: false,
      badge: null,
    },
    {
      name: "Venue Starter",
      description: "Perfect for emergency cover.",
      price: "$0",
      duration: "month",
      subPrice: "+ $20 Booking Fee per shift",
      features: [
        "No monthly subscription",
        "Pay only when you book",
        "Access to all vetted staff",
        "Standard Support",
      ],
      cta: "Post a Job",
      buttonVariant: "outline" as const,
      highlighted: false,
      badge: null,
    },
    {
      name: "Venue Unlimited",
      description: "For venues that need regular reliable cover.",
      price: "$49",
      duration: "month",
      subPrice: "$0 Booking Fees",
      features: [
        "Unlimited Booking Fees waived",
        "Smart-Fill Roster Technology",
        "Dedicated Account Manager",
        "Save ~30% after 3 shifts",
      ],
      cta: "Start Free Trial",
      buttonVariant: "accent" as const,
      highlighted: true,
      badge: "Most Popular",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-[#0A0A0A] overflow-x-hidden" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. No hidden fees, just verified
            professionals and seamless connections.
          </p>
        </div>

        {/* Add top padding to accommodate badges that extend above cards, especially on mobile */}
        <div className="grid md:grid-cols-3 gap-6 pt-6 md:pt-4 items-start">
          {tiers.map((tier) => (
              /* Keep overflow-visible to prevent badge clipping */
              <Card
                key={tier.name}
                className={`relative flex flex-col overflow-visible rounded-3xl p-10 transition-all duration-300 ${
                tier.highlighted
                  ? "border-2 border-[#BFFF00] scale-105 z-10 bg-[#161616] shadow-[0_0_40px_rgba(191,255,0,0.15)]"
                  : "border border-zinc-800 bg-[#161616] hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20" data-testid="pricing-badge">
                  <span className="bg-[#BFFF00] text-black text-xs font-black px-3 py-1 rounded-full">
                    {tier.badge}
                  </span>
                </div>
              )}
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-2xl font-bold text-white">
                  {tier.name}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow p-0">
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-white">
                      {tier.price}
                    </span>
                    {tier.duration && (
                      <span className="text-zinc-500 ml-2 text-lg">
                        / {tier.duration}
                      </span>
                    )}
                  </div>
                  {tier.subPrice && (
                    <div className="mt-2">
                      <span className="text-sm text-zinc-400 font-medium">
                        {tier.subPrice}
                      </span>
                    </div>
                  )}
                </div>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-[#BFFF00] mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-0 pt-8">
                {tier.cta === "Join as Pro" ? (
                  <Link to="/signup" className="w-full">
                    <Button
                      className="w-full font-bold py-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-all duration-300"
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                ) : tier.cta === "Post a Job" ? (
                  <Link to="/post-job" className="w-full">
                    <Button
                      className="w-full font-bold py-4 rounded-full border-2 border-white text-white bg-transparent hover:bg-white/5 transition-all duration-300"
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full font-black py-4 rounded-full bg-[#BFFF00] text-black hover:shadow-[0_0_20px_rgba(191,255,0,0.4)] transition-all duration-300"
                    onClick={() => {
                      toast({
                        title: "Coming soon!",
                        description: "Free trial signup will be available soon.",
                      });
                    }}
                  >
                    {tier.cta}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
