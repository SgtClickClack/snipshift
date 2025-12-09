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
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const tiers = [
    {
      name: "Professional",
      description: "For barbers & stylists seeking freedom.",
      price: "Free",
      duration: "Forever",
      subPrice: null,
      features: [
        "Keep 100% of your hourly rate",
        "Instant payouts available",
        "Build your digital reputation",
        "Access to premium shifts",
      ],
      cta: "Join as Pro",
      buttonVariant: "secondary" as const,
      highlighted: false,
      badge: null,
    },
    {
      name: "Salon Starter",
      description: "Perfect for occasional cover and emergencies.",
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
      name: "Salon Unlimited",
      description: "For shops that need regular reliable cover.",
      price: "$49",
      duration: "month",
      subPrice: "$0 Booking Fees",
      features: [
        "Unlimited Booking Fees waived",
        "Priority matching algorithm",
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
    <section className="py-20 bg-background border-t border-border overflow-x-hidden" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. No hidden fees, just verified
            professionals and seamless connections.
          </p>
        </div>

        {/* Add top padding to accommodate badges that extend above cards, especially on mobile */}
        <div className="grid md:grid-cols-3 gap-8 pt-6 md:pt-4">
          {tiers.map((tier) => (
            <>
              {/* Keep overflow-visible to prevent badge clipping */}
              <Card
                key={tier.name}
                className={`relative flex flex-col overflow-visible ${
                tier.highlighted
                  ? "border-2 border-red-accent/50 shadow-2xl shadow-red-accent/20 md:scale-105 z-elevated bg-card"
                  : "border border-border hover:shadow-lg hover:border-border/80 bg-card"
              } transition-all duration-300`}
            >
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-badge" data-testid="pricing-badge">
                  <span className="bg-red-accent text-white text-sm font-bold px-4 py-1 rounded-full shadow-md">
                    {tier.badge}
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-card-foreground">
                  {tier.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-card-foreground">
                      {tier.price}
                    </span>
                    {tier.duration && (
                      <span className="text-muted-foreground ml-2 text-lg">
                        / {tier.duration}
                      </span>
                    )}
                  </div>
                  {tier.subPrice && (
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground font-medium">
                        {tier.subPrice}
                      </span>
                    </div>
                  )}
                </div>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-red-accent mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {tier.cta === "Join as Pro" ? (
                  <Link to="/signup" className="w-full">
                    <Button
                      variant={tier.buttonVariant}
                      className="w-full font-semibold py-6"
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                ) : tier.cta === "Post a Job" ? (
                  <Link to="/post-job" className="w-full">
                    <Button
                      variant={tier.buttonVariant}
                      className="w-full font-semibold py-6"
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant={tier.buttonVariant}
                    className="w-full font-semibold py-6"
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
            </>
          ))}
        </div>
      </div>
    </section>
  );
}
