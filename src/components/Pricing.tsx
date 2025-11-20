import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Pricing() {
  const tiers = [
    {
      name: "Freelancer",
      description: "For individual barbers & stylists",
      price: "Free",
      duration: "forever",
      features: [
        "Create professional profile",
        "Browse available shifts",
        "Apply to top-rated shops",
        "Verified professional badge",
        "Basic portfolio showcase",
        "Community access",
      ],
      cta: "Start Working",
      highlighted: false,
    },
    {
      name: "Shop Owner",
      description: "For managing a single location",
      price: "$49",
      duration: "/month",
      features: [
        "Post unlimited shifts",
        "Access verified professionals",
        "Seamless workforce flexibility",
        "Shift management dashboard",
        "Rating & review system",
        "Direct messaging",
        "Priority support",
      ],
      cta: "Start Hiring",
      highlighted: true,
    },
    {
      name: "Enterprise",
      description: "For multiple locations & brands",
      price: "Custom",
      duration: "",
      features: [
        "Multi-location management",
        "Advanced analytics dashboard",
        "Dedicated account manager",
        "Custom onboarding",
        "API access",
        "White-label options",
        "Bulk shift posting",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-steel-50" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-steel-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-steel-600 max-w-2xl mx-auto">
            Choose the plan that fits your needs. No hidden fees, just verified
            professionals and seamless connections.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${
                tier.highlighted
                  ? "border-red-accent shadow-xl scale-105 z-10"
                  : "border-steel-200 hover:shadow-lg hover:border-steel-300"
              } transition-all duration-300 bg-white`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-red-accent text-white text-sm font-bold px-4 py-1 rounded-full shadow-md">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-steel-900">
                  {tier.name}
                </CardTitle>
                <CardDescription className="text-steel-500">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-steel-900">
                    {tier.price}
                  </span>
                  <span className="text-steel-500 ml-1">{tier.duration}</span>
                </div>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-red-accent mr-2 flex-shrink-0" />
                      <span className="text-steel-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${
                    tier.highlighted
                      ? "bg-red-accent hover:bg-red-accent-hover text-white"
                      : "bg-steel-100 hover:bg-steel-200 text-steel-900"
                  } font-semibold py-6`}
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

