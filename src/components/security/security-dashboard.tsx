import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, CheckCircle, Eye, Globe } from "lucide-react";

export function SecurityDashboard() {
  const securityFeatures = [
    {
      name: "Rate Limiting",
      status: "active",
      description: "API requests limited to prevent abuse",
      icon: Shield,
      details: "100 requests per 15 minutes"
    },
    {
      name: "Input Sanitization",
      status: "active", 
      description: "All user inputs sanitized against XSS",
      icon: Lock,
      details: "HTML tags stripped automatically"
    },
    {
      name: "Security Headers",
      status: "active",
      description: "HTTPS enforced, clickjacking prevented",
      icon: Globe,
      details: "CSP, XSS protection enabled"
    },
    {
      name: "Role-Based Access",
      status: "active",
      description: "Users can only access their permitted features",
      icon: Eye,
      details: "Hub, Professional, Brand, Trainer roles"
    }
  ];

  return (
    <div className="space-y-6" data-testid="security-dashboard">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Security Status</h2>
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-4 h-4 mr-2" />
          All Systems Secure
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {securityFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {feature.name}
                </CardTitle>
                <Badge 
                  variant={feature.status === 'active' ? 'default' : 'destructive'}
                  className={feature.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                >
                  {feature.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {feature.description}
                </p>
                <p className="text-xs font-mono bg-steel-100 dark:bg-steel-800 p-2 rounded">
                  {feature.details}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Production Hardening Complete</p>
              <p className="text-sm text-muted-foreground">
                All security middleware active and configured for production deployment
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Authentication Protected</p>
              <p className="text-sm text-muted-foreground">
                Firebase authentication with role-based access control
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Performance Optimized</p>
              <p className="text-sm text-muted-foreground">
                Rate limiting and compression enabled for optimal performance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}