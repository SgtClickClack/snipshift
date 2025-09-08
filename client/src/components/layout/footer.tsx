import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Scale, 
  Shield, 
  Mail, 
  MapPin, 
  Globe,
  Users,
  Briefcase,
  GraduationCap,
  Building2,
  Flag
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-neutral-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold">Snipshift</h3>
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Australia's premier marketplace connecting barbershops, professionals, 
              brands, and trainers in the creative industry.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-400 border-green-400">
                <MapPin className="w-3 h-3 mr-1" />
                Australian Owned
              </Badge>
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                <Shield className="w-3 h-3 mr-1" />
                Secure Platform
              </Badge>
            </div>
          </div>

          {/* For Professionals */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">For Professionals</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/signup" 
                  className="text-neutral-400 hover:text-white transition-colors flex items-center"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Find Shifts
                </Link>
              </li>
              <li>
                <Link 
                  to="/training-hub" 
                  className="text-neutral-400 hover:text-white transition-colors flex items-center"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Training Hub
                </Link>
              </li>
              <li>
                <Link 
                  to="/community" 
                  className="text-neutral-400 hover:text-white transition-colors flex items-center"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Community
                </Link>
              </li>
              <li>
                <Link 
                  to="/professional-dashboard" 
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Professional Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* For Businesses */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">For Businesses</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/signup" 
                  className="text-neutral-400 hover:text-white transition-colors flex items-center"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Hub Owner Signup
                </Link>
              </li>
              <li>
                <Link 
                  to="/brand-dashboard" 
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Brand Partnership
                </Link>
              </li>
              <li>
                <Link 
                  to="/trainer-dashboard" 
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Trainer Portal
                </Link>
              </li>
              <li>
                <a 
                  href="#insurance" 
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Insurance Partners
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Legal & Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/terms-of-service" 
                  className="text-neutral-400 hover:text-white transition-colors flex items-center"
                  data-testid="link-terms-of-service"
                >
                  <Scale className="w-4 h-4 mr-2" />
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy-policy" 
                  className="text-neutral-400 hover:text-white transition-colors flex items-center"
                  data-testid="link-privacy-policy"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/anti-spam-policy" 
                  className="text-neutral-400 hover:text-white transition-colors flex items-center"
                  data-testid="link-anti-spam-policy"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Anti-Spam Policy
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:support@snipshift.com.au" 
                  className="text-neutral-400 hover:text-white transition-colors flex items-center"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Support
                </a>
              </li>
              <li>
                <a 
                  href="https://snipshift.com.au" 
                  className="text-neutral-400 hover:text-white transition-colors flex items-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Official Website
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-neutral-700" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-neutral-400">
            <p>© {currentYear} Snipshift. All rights reserved.</p>
            <p className="mt-1">ABN: [To be registered] | Registered in Australia</p>
          </div>

          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
            <div className="flex items-center text-sm text-neutral-400">
              <Shield className="w-4 h-4 mr-2 text-green-400" />
              <span>Australian Privacy Act Compliant</span>
            </div>
            <div className="flex items-center text-sm text-neutral-400">
              <Scale className="w-4 h-4 mr-2 text-blue-400" />
              <span>Fair Work Act Compliant</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 pt-6 border-t border-neutral-700">
          <p className="text-xs text-neutral-500 text-center md:text-left">
            <strong>Disclaimer:</strong> Snipshift operates as a marketplace platform connecting users. 
            We are not an employer and do not provide direct employment. Users are responsible for 
            their own professional licensing, insurance, and tax obligations. All transactions are 
            subject to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </footer>
  );
}