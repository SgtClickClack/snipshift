import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  Info,
  Phone,
  FileText,
  Calculator
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InsuranceSupportProps {
  userRole: string;
  currentState: string;
}

interface InsuranceProvider {
  id: string;
  name: string;
  description: string;
  coverage: string[];
  premium: string;
  rating: number;
  website: string;
  phone: string;
}

const INSURANCE_PROVIDERS: InsuranceProvider[] = [
  {
    id: "tradie-protect",
    name: "Tradie Protect Insurance",
    description: "Specialized coverage for barbering and beauty professionals",
    coverage: ["Public Liability", "Professional Indemnity", "Product Liability", "Personal Accident"],
    premium: "From $29/month",
    rating: 4.8,
    website: "https://www.tradieprotect.com.au/barber-insurance",
    phone: "1300 123 456"
  },
  {
    id: "aami-business",
    name: "AAMI Business Insurance",
    description: "Comprehensive business insurance for service professionals",
    coverage: ["Public Liability", "Professional Indemnity", "Contents Insurance", "Business Interruption"],
    premium: "From $35/month",
    rating: 4.6,
    website: "https://www.aami.com.au/business-insurance",
    phone: "13 22 44"
  },
  {
    id: "guild-insurance",
    name: "Guild Insurance",
    description: "Australia's leading mutual insurer for professionals",
    coverage: ["Public Liability", "Professional Indemnity", "Cyber Liability", "Employment Practices"],
    premium: "From $42/month",
    rating: 4.7,
    website: "https://www.guildinsurance.com.au/small-business",
    phone: "1800 810 213"
  }
];

export default function InsuranceSupport({ userRole, currentState }: InsuranceSupportProps) {
  const [insuranceStatus, setInsuranceStatus] = useState<'none' | 'expired' | 'active'>('none');
  const [showProviders, setShowProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<InsuranceProvider | null>(null);
  const { toast } = useToast();

  const handleGetQuote = (provider: InsuranceProvider) => {
    // Simulate opening partner quote form with pre-filled information
    const quoteParams = new URLSearchParams({
      profession: 'barber',
      state: currentState,
      platform: 'snipshift',
      referral: 'partner'
    });
    
    const quoteUrl = `${provider.website}?${quoteParams.toString()}`;
    
    toast({
      title: "Opening Insurance Quote",
      description: `Redirecting to ${provider.name} with your details pre-filled`,
    });
    
    // In a real implementation, this would open the partner's quote form
    console.log(`Opening quote URL: ${quoteUrl}`);
    
    // Simulate opening in new tab
    if (typeof window !== 'undefined') {
      window.open(quoteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCallProvider = (provider: InsuranceProvider) => {
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${provider.phone}`;
    }
  };

  const getInsuranceStatusBadge = () => {
    switch (insuranceStatus) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active Coverage</Badge>;
      case 'expired':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertTriangle className="w-3 h-3 mr-1" />No Coverage</Badge>;
    }
  };

  const getInsuranceAlert = () => {
    if (insuranceStatus === 'none') {
      return (
        <Alert className="border-red-200 bg-red-50">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Important:</strong> You don't have professional insurance coverage. 
            This is required for most barbering work in Australia and protects you from liability claims.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (insuranceStatus === 'expired') {
      return (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Action Required:</strong> Your insurance has expired. 
            Renew immediately to continue working and maintain coverage.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6" data-testid="insurance-support">
      {/* Insurance Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Professional Insurance
            </CardTitle>
            {getInsuranceStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {getInsuranceAlert()}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => setShowProviders(!showProviders)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-get-insured"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Get Insurance Quote
            </Button>
            <Button 
              variant="outline"
              onClick={() => setInsuranceStatus(insuranceStatus === 'active' ? 'none' : 'active')}
              data-testid="button-update-status"
            >
              <FileText className="w-4 h-4 mr-2" />
              Update Status
            </Button>
          </div>

          {/* Insurance Requirements Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-medium text-blue-900 mb-2">Why You Need Insurance</h4>
                <ul className="space-y-1 text-blue-800">
                  <li>• <strong>Public Liability:</strong> Protection if a client is injured</li>
                  <li>• <strong>Professional Indemnity:</strong> Cover for work-related claims</li>
                  <li>• <strong>Product Liability:</strong> Protection for product-related issues</li>
                  <li>• <strong>Legal Requirement:</strong> Required by most employers and venues</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance Providers */}
      {showProviders && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recommended Insurance Providers
          </h3>
          
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {INSURANCE_PROVIDERS.map((provider) => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-sm text-muted-foreground">Rating:</span>
                        <span className="font-medium text-yellow-600">{provider.rating}/5</span>
                      </div>
                    </div>
                    <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                      {provider.premium}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{provider.description}</p>
                  
                  <div>
                    <h5 className="text-sm font-medium mb-2">Coverage Includes:</h5>
                    <div className="flex flex-wrap gap-1">
                      {provider.coverage.map((item) => (
                        <Badge key={item} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => handleGetQuote(provider)}
                      className="w-full"
                      data-testid={`button-quote-${provider.id}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Get Free Quote
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleCallProvider(provider)}
                      className="w-full"
                      data-testid={`button-call-${provider.id}`}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call {provider.phone}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}