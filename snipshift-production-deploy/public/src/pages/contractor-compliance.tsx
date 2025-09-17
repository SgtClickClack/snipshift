import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Scale, 
  Shield, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Users,
  Building2,
  DollarSign,
  Calendar,
  BookOpen,
  ExternalLink,
  Download,
  Flag
} from "lucide-react";

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  status: "compliant" | "warning" | "action_required";
  lastChecked: Date;
  resources: string[];
}

interface ContractorRight {
  title: string;
  description: string;
  legislation: string;
  examples: string[];
}

export default function ContractorCompliance() {
  const [activeTab, setActiveTab] = useState("overview");

  const complianceChecklist: ComplianceItem[] = [
    {
      id: "abn_verification",
      title: "ABN Verification Required",
      description: "All contractors must provide valid Australian Business Number",
      status: "compliant",
      lastChecked: new Date(),
      resources: ["ABN Lookup Tool", "Business Registration Guide"]
    },
    {
      id: "insurance_requirements",
      title: "Professional Indemnity & Public Liability Insurance",
      description: "Minimum $1M coverage required for barbering services",
      status: "compliant", 
      lastChecked: new Date(),
      resources: ["Insurance Partner Portal", "Coverage Requirements"]
    },
    {
      id: "pay_rate_compliance",
      title: "Minimum Pay Rate Standards",
      description: "Rates must meet or exceed industry award minimums",
      status: "warning",
      lastChecked: new Date(),
      resources: ["Fair Work Ombudsman", "Award Rate Calculator"]
    },
    {
      id: "worker_classification",
      title: "Contractor vs Employee Classification",
      description: "Proper classification to avoid sham contracting",
      status: "compliant",
      lastChecked: new Date(),
      resources: ["ATO Decision Tool", "Classification Guidelines"]
    },
    {
      id: "superannuation",
      title: "Superannuation Obligations",
      description: "Understanding when super is required for contractors",
      status: "action_required",
      lastChecked: new Date(),
      resources: ["ATO Super Guidelines", "Contractor Super Tool"]
    },
    {
      id: "gst_compliance",
      title: "GST Registration & Invoicing",
      description: "GST obligations for contractors earning >$75,000",
      status: "compliant",
      lastChecked: new Date(),
      resources: ["GST Registration Portal", "Invoice Templates"]
    }
  ];

  const contractorRights: ContractorRight[] = [
    {
      title: "Right to Fair Payment",
      description: "Contractors have the right to be paid in accordance with agreed terms and within reasonable timeframes.",
      legislation: "Independent Contractors Act 2006",
      examples: [
        "Payment within 30 days unless otherwise agreed",
        "Clear payment terms in contracts",
        "Right to dispute unfair payment terms"
      ]
    },
    {
      title: "Right to Unfair Contract Protection",
      description: "Protection against unfair contract terms that create significant imbalance.",
      legislation: "Competition and Consumer Act 2010",
      examples: [
        "Unreasonable termination clauses",
        "Excessive penalties or fees",
        "Unilateral contract variations"
      ]
    },
    {
      title: "Workplace Health & Safety",
      description: "Right to a safe working environment, even as a contractor.",
      legislation: "Work Health and Safety Act 2011",
      examples: [
        "Proper safety equipment provided",
        "Safe work procedures followed",
        "Incident reporting procedures"
      ]
    },
    {
      title: "Anti-Discrimination Protection",
      description: "Protection from discrimination based on protected attributes.",
      legislation: "Australian Human Rights Commission Act 1986",
      examples: [
        "Equal opportunity regardless of gender, age, ethnicity",
        "Reasonable adjustments for disability",
        "Protection from harassment"
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "action_required":
        return <Clock className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant": return "bg-green-600";
      case "warning": return "bg-yellow-600";
      case "action_required": return "bg-red-600";
      default: return "bg-gray-600";
    }
  };

  const complianceScore = Math.round(
    (complianceChecklist.filter(item => item.status === "compliant").length / 
     complianceChecklist.length) * 100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Scale className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-neutral-900">Contractor Compliance</h1>
          </div>
          <p className="text-neutral-600 max-w-3xl mx-auto">
            Comprehensive guide to Australian contractor regulations, rights, and compliance 
            requirements for the barbering and creative industries.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline">🇦🇺 Australian Law</Badge>
            <Badge variant="outline">Fair Work Compliant</Badge>
            <Badge className="bg-blue-600">Industry Specific</Badge>
          </div>
        </div>

        {/* Compliance Score */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-800">Platform Compliance Score</h3>
                <p className="text-blue-600">Based on Australian contractor regulations</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-800">{complianceScore}%</div>
                <Progress value={complianceScore} className="w-32 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="rights" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Rights
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">2.8M</div>
                  <div className="text-sm text-muted-foreground">Contractors in Australia</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Building2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">45,000+</div>
                  <div className="text-sm text-muted-foreground">Licensed Barbers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">$23.50</div>
                  <div className="text-sm text-muted-foreground">Minimum Award Rate</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-sm text-muted-foreground">Verified Users</div>
                </CardContent>
              </Card>
            </div>

            {/* Regulatory Framework */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Scale className="h-5 w-5 mr-2" />
                  Australian Regulatory Framework
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Federal Legislation</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3" />
                        <div>
                          <strong>Fair Work Act 2009</strong> - Employee vs contractor distinction
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3" />
                        <div>
                          <strong>Independent Contractors Act 2006</strong> - Contractor protections
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3" />
                        <div>
                          <strong>Competition and Consumer Act 2010</strong> - Unfair contract terms
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3" />
                        <div>
                          <strong>Work Health and Safety Act 2011</strong> - Workplace safety
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Industry-Specific Requirements</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3" />
                        <div>
                          <strong>Health Practitioner Registration</strong> - State licensing requirements
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3" />
                        <div>
                          <strong>Public Health Regulations</strong> - Hygiene and safety standards
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3" />
                        <div>
                          <strong>Professional Indemnity</strong> - Insurance requirements
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3" />
                        <div>
                          <strong>Award Rates</strong> - Hair and Beauty Industry Award
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Compliance Areas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-green-700">
                  <p className="text-sm mb-3">
                    Proper contractor vs employee classification is critical to avoid 
                    sham contracting penalties.
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>• True independence in work methods</li>
                    <li>• Own tools and equipment</li>
                    <li>• Multiple clients/income sources</li>
                    <li>• Commercial risk and reward</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800 flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Protections
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-blue-700">
                  <p className="text-sm mb-3">
                    Contractors have rights to fair treatment, payment, and protection 
                    from unfair contract terms.
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>• Unfair contract term protection</li>
                    <li>• Right to representation</li>
                    <li>• Workplace safety coverage</li>
                    <li>• Anti-discrimination protection</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-purple-800 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-purple-700">
                  <p className="text-sm mb-3">
                    Proper contracts and documentation protect both parties and 
                    ensure compliance with regulations.
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>• Written contractor agreements</li>
                    <li>• ABN verification records</li>
                    <li>• Insurance certificates</li>
                    <li>• Payment documentation</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-6">
            <div className="space-y-4">
              {complianceChecklist.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1 text-white capitalize">
                              {item.status.replace('_', ' ')}
                            </span>
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Last checked: {item.lastChecked.toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-medium text-lg">{item.title}</h4>
                          <p className="text-muted-foreground mt-1">{item.description}</p>
                        </div>

                        <div>
                          <h5 className="text-sm font-medium mb-2">Resources:</h5>
                          <div className="flex flex-wrap gap-2">
                            {item.resources.map((resource, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {resource}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="ml-6">
                        {item.status === "action_required" && (
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            Take Action
                          </Button>
                        )}
                        {item.status === "warning" && (
                          <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-600">
                            Review
                          </Button>
                        )}
                        {item.status === "compliant" && (
                          <Button size="sm" variant="outline" className="border-green-600 text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Compliant
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rights" className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <Scale className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Know Your Rights:</strong> All contractors working through Snipshift 
                are protected by Australian law. These rights cannot be waived or contracted out.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              {contractorRights.map((right, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Scale className="h-5 w-5 mr-2 text-blue-600" />
                      {right.title}
                    </CardTitle>
                    <Badge variant="outline" className="w-fit">
                      {right.legislation}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{right.description}</p>
                    
                    <div>
                      <h5 className="font-medium mb-2">Practical Examples:</h5>
                      <ul className="space-y-1">
                        {right.examples.map((example, idx) => (
                          <li key={idx} className="flex items-start text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3" />
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            {/* Government Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Flag className="h-5 w-5 mr-2" />
                  Government Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Federal Agencies</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Fair Work Ombudsman
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Australian Taxation Office
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        ACCC - Consumer Rights
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Safe Work Australia
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Industry Bodies</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Hair & Beauty Industry Association
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Australian Hair & Beauty College
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Professional Beauty Association
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Barbershop Connect Australia
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Legal Templates & Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                    <div className="flex items-center w-full mb-2">
                      <Download className="h-4 w-4 mr-2" />
                      <span className="font-medium">Contractor Agreement</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      Standard template for barbering contractors with Australian law compliance
                    </span>
                  </Button>

                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                    <div className="flex items-center w-full mb-2">
                      <Download className="h-4 w-4 mr-2" />
                      <span className="font-medium">Safety Checklist</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      WHS compliance checklist for barbershops and contractors
                    </span>
                  </Button>

                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                    <div className="flex items-center w-full mb-2">
                      <Download className="h-4 w-4 mr-2" />
                      <span className="font-medium">Invoice Template</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      GST-compliant invoice template for contractors
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="text-green-700 space-y-3">
                <p className="text-sm">
                  For compliance questions or concerns, contact our legal team or consult 
                  with qualified employment law professionals.
                </p>
                <div className="space-y-2 text-sm">
                  <div><strong>Compliance Team:</strong> compliance@snipshift.com.au</div>
                  <div><strong>Legal Helpline:</strong> 1800-SNIPSHIFT</div>
                  <div><strong>Emergency Issues:</strong> Use the platform report feature</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-8" />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p className="mb-2">
            This information is provided as general guidance only and does not constitute 
            legal advice. Always consult qualified legal professionals for specific situations.
          </p>
          <p>
            Last updated: September 2025 | Based on current Australian federal and state legislation
          </p>
        </div>
      </div>
    </div>
  );
}