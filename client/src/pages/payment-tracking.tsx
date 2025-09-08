import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OffPlatformTracker from "@/components/payments/off-platform-tracker";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Users,
  Building2,
  GraduationCap
} from "lucide-react";

export default function PaymentTracking() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("tracker");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">
              Please log in to access payment tracking features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Receipt className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-neutral-900">Payment Tracking</h1>
          </div>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Comprehensive payment tracking and analytics for all your barbering business transactions, 
            both on-platform and off-platform.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline">Transparency First</Badge>
            <Badge variant="outline">Complete Records</Badge>
            <Badge className="bg-blue-600">Business Intelligence</Badge>
          </div>
        </div>

        {/* Payment Tracking Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tracker" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Off-Platform Tracking
            </TabsTrigger>
            <TabsTrigger value="platform" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Platform Payments
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracker" className="space-y-6">
            <OffPlatformTracker userId={user.id} userRole={user.currentRole || 'professional'} />
          </TabsContent>

          <TabsContent value="platform" className="space-y-6">
            {/* Platform Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">$1,847</div>
                  <div className="text-sm text-muted-foreground">Platform Payments</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">23</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">89%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">$184.70</div>
                  <div className="text-sm text-muted-foreground">Platform Fees</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Platform Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Recent Platform Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Advanced Fade Techniques</div>
                        <div className="text-sm text-muted-foreground">Training purchase from Master Tony Ricci</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">$149.00</div>
                      <Badge className="bg-green-600">Completed</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">Premium Listing Upgrade</div>
                        <div className="text-sm text-muted-foreground">Featured job posting for 7 days</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">$29.99</div>
                      <Badge className="bg-green-600">Completed</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium">Digital Marketing Course</div>
                        <div className="text-sm text-muted-foreground">Training purchase from Lisa Zhang</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">$89.00</div>
                      <Badge className="bg-green-600">Completed</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="border-blue-200 bg-blue-50">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    All platform payments are processed securely through Stripe with enterprise-grade 
                    encryption. We support all major credit cards, debit cards, and digital wallets 
                    for seamless transactions.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <PieChart className="h-5 w-5 mr-2 text-blue-600" />
                    Payment Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Platform Payments</span>
                      <span className="font-medium">65%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Off-Platform Cash</span>
                      <span className="font-medium">25%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Bank Transfers</span>
                      <span className="font-medium">10%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Monthly Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">+23%</div>
                    <div className="text-sm text-muted-foreground">vs. last month</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sep 2024</span>
                      <span className="font-medium">$2,847</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Aug 2024</span>
                      <span className="font-medium">$2,314</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Jul 2024</span>
                      <span className="font-medium">$1,987</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                    Transaction Types
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shift Payments</span>
                      <span className="font-medium">$1,890</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Training Purchases</span>
                      <span className="font-medium">$567</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tips & Gratuity</span>
                      <span className="font-medium">$234</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Product Purchases</span>
                      <span className="font-medium">$156</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Business Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Revenue Optimization</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Platform payments provide better tracking and security</li>
                      <li>• Consider offering platform-exclusive incentives</li>
                      <li>• Training content generates highest margins</li>
                      <li>• Weekend shifts command premium rates</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Growth Opportunities</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Expand training content offerings</li>
                      <li>• Develop premium service packages</li>
                      <li>• Partner with high-end barbershops</li>
                      <li>• Create loyalty programs for repeat clients</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}