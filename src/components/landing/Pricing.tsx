import { Check, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Helper to render feature text with **bold** markdown support
function renderFeature(feature: string) {
  const parts = feature.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return feature;
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
  );
}

export default function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "$0",
      duration: "month",
      description: "Perfect for occasional emergency cover.",
      features: [
        "$20 Booking Fee per shift",
        "Access to all vetted staff",
        "Standard Support",
      ],
      cta: "Post a Job",
      highlighted: false,
      badge: null,
    },
    {
      name: "Business",
      price: "$149",
      duration: "month",
      description: "For venues that need a regular, reliable roster.",
      features: [
        "**Unlimited Booking Fees waived**",
        "Smart-Fill Roster Technology",
        "Priority Support",
        "Dedicated Account Manager",
      ],
      cta: "Start 14-Day Free Trial",
      highlighted: true,
      badge: "Most Popular",
    },
    {
      name: "Enterprise",
      price: "Custom",
      duration: null,
      description: "Centralized staffing for hospitality groups.",
      features: [
        "Multi-location dashboard",
        "Volume-based staff discounts",
        "Custom contract management",
        "24/7 Premium Support",
      ],
      cta: "Contact Sales",
      highlighted: false,
      badge: null,
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
            Choose the plan that fits your venue. No hidden fees, just verified
            professionals and seamless connections.
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            Pricing below is for venues. Looking for work?{" "}
            <Link to="/signup?role=professional" className="text-[#BFFF00] hover:underline font-medium">
              Join as a Professional — it's free
            </Link>
          </p>
        </div>

        {/* Add top padding to accommodate badges that extend above cards, especially on mobile */}
        <div className="grid md:grid-cols-3 gap-6 pt-6 md:pt-4 items-start">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col overflow-visible rounded-3xl p-10 transition-all duration-300 ${
                plan.highlighted
                  ? "border-2 border-[#BFFF00] scale-105 z-10 bg-zinc-900 shadow-2xl"
                  : "border border-zinc-800 bg-[#161616] hover:border-[#BFFF00]/50 hover:-translate-y-2 hover:shadow-2xl"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20" data-testid={`pricing-badge-${plan.name.toLowerCase()}`}>
                  <span className="bg-[#BFFF00] text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {plan.badge}
                  </span>
                </div>
              )}
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-2xl font-bold text-white">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow p-0">
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-white">
                      {plan.price}
                    </span>
                    {plan.duration && (
                      <span className="text-zinc-500 ml-2 text-lg">
                        / {plan.duration}
                      </span>
                    )}
                  </div>
                  {plan.price === "$0" && (
                    <div className="mt-2">
                      <span className="text-sm text-zinc-400 font-medium">
                        Pay per booking
                      </span>
                    </div>
                  )}
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-[#BFFF00] mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300 text-sm">{renderFeature(feature)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-0 pt-8">
                {plan.cta === "Post a Job" ? (
                  <Link to="/signup?plan=starter" className="w-full">
                    <Button
                      className="w-full font-bold py-4 rounded-full border-2 border-zinc-600 text-white bg-transparent hover:bg-white/5 hover:border-[#BFFF00]/50 transition-all duration-300"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                ) : plan.cta === "Start 14-Day Free Trial" ? (
                  <Link to="/signup?plan=business&trial=true" className="w-full" data-testid="business-trial-cta">
                    <Button
                      className="w-full font-black py-4 rounded-full bg-[#BFFF00] text-black hover:shadow-[0_0_20px_rgba(191,255,0,0.4)] transition-all duration-300"
                      data-testid="business-trial-button"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                ) : (
                  <Link to="/contact?inquiry=enterprise" className="w-full">
                    <Button
                      className="w-full font-bold py-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-all duration-300"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Staff CTA Section */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-[#BFFF00]/10 rounded-full">
                <Users className="h-8 w-8 text-[#BFFF00]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Looking for Hospitality Work?
            </h3>
            <p className="text-zinc-400 mb-6">
              Join HospoGo as a professional — it's <span className="text-[#BFFF00] font-semibold">100% free</span>.
              Get access to shifts from top venues, keep all your earnings, and build your reputation.
            </p>
            <Link to="/signup?role=professional">
              <Button className="font-bold py-3 px-8 rounded-full border-2 border-[#BFFF00] text-[#BFFF00] bg-transparent hover:bg-[#BFFF00] hover:text-black transition-all duration-300">
                Join as a Professional
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </section>
  );
}
