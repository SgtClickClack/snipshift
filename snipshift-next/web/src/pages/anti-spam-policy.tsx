import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Flag,
  Users,
  MessageSquare,
  Eye,
  Clock
} from "lucide-react";

export default function AntiSpamPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-red-600 mr-3" />
            <h1 className="text-4xl font-bold text-neutral-900">Anti-Spam Policy</h1>
          </div>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Maintaining a professional, spam-free environment for the Australian 
            barbering and creative industries community.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline">Effective: September 2025</Badge>
            <Badge variant="outline">Version 1.0</Badge>
            <Badge className="bg-red-600">Zero Tolerance</Badge>
          </div>
        </div>

        <div className="space-y-6">
          {/* Policy Summary */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Zero Tolerance Policy:</strong> Snipshift maintains a strict anti-spam 
              policy to protect our professional community. Violations may result in immediate 
              account suspension and removal from the platform.
            </AlertDescription>
          </Alert>

          {/* What Constitutes Spam */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flag className="h-5 w-5 mr-2 text-red-600" />
                1. What Constitutes Spam
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1.1 Promotional Spam</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Excessive promotion of external businesses or services</li>
                  <li>Repeated posting of identical or near-identical content</li>
                  <li>Unsolicited direct marketing messages to other users</li>
                  <li>Promoting non-industry related products or services</li>
                  <li>Using fake urgency tactics ("limited time," "act now," etc.)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">1.2 Contact Information Abuse</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Sharing personal phone numbers or email addresses in public posts</li>
                  <li>Directing users to external contact methods to bypass platform protections</li>
                  <li>Mass messaging users with promotional content</li>
                  <li>Collecting user contact information for external use</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">1.3 Content Manipulation</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Using excessive capitalization to grab attention</li>
                  <li>Posting irrelevant content to hijack discussions</li>
                  <li>Creating multiple accounts to amplify content</li>
                  <li>Using misleading or clickbait titles</li>
                  <li>Posting repetitive or low-quality content</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">1.4 External Link Abuse</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Sharing links to unrelated or suspicious websites</li>
                  <li>Promoting affiliate or referral links without disclosure</li>
                  <li>Directing traffic away from the platform inappropriately</li>
                  <li>Sharing malicious or phishing links</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Automated Detection */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <Eye className="h-5 w-5 mr-2" />
                2. Automated Spam Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">2.1 Content Analysis</h4>
                <p className="mb-2">Our automated systems analyze all content for:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Spam Keywords:</strong> Common promotional and urgency language</li>
                  <li><strong>External Links:</strong> Links to non-approved external websites</li>
                  <li><strong>Contact Information:</strong> Phone numbers, emails, and social media handles</li>
                  <li><strong>Repetitive Content:</strong> Duplicate or near-duplicate posts</li>
                  <li><strong>Formatting Abuse:</strong> Excessive caps, symbols, or special characters</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2.2 Risk Scoring</h4>
                <p className="text-sm">
                  Each post receives a risk score from 0-100%. Posts with high risk scores 
                  are automatically flagged for human review before publication.
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span><strong>0-30%:</strong> Automatically approved</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                    <span><strong>30-70%:</strong> Flagged for review</span>
                  </div>
                  <div className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-600 mr-2" />
                    <span><strong>70-100%:</strong> Blocked pending review</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moderation Process */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                3. Human Moderation Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">3.1 Review Queue</h4>
                <p className="text-sm mb-2">
                  Flagged content is reviewed by our moderation team within 24 hours. 
                  Our moderators are trained to understand industry-specific context and 
                  legitimate business communications.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.2 Review Criteria</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Industry relevance and professional value</li>
                  <li>Community guidelines compliance</li>
                  <li>Authenticity and good faith intent</li>
                  <li>User history and reputation</li>
                  <li>Content quality and originality</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.3 Decision Process</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="border border-green-200 bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="font-medium text-green-800">Approved</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Content meets community standards and provides value to professionals.
                    </p>
                  </div>
                  <div className="border border-red-200 bg-red-50 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <XCircle className="h-4 w-4 text-red-600 mr-2" />
                      <span className="font-medium text-red-800">Rejected</span>
                    </div>
                    <p className="text-sm text-red-700">
                      Content violates spam policy or community guidelines.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consequences */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                4. Consequences of Spam Violations
              </CardTitle>
            </CardHeader>
            <CardContent className="text-yellow-800 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">4.1 Progressive Enforcement</h4>
                <div className="space-y-3">
                  <div className="border-l-4 border-yellow-400 pl-3">
                    <div className="font-medium">First Violation</div>
                    <div className="text-sm">Warning message and content removal</div>
                  </div>
                  <div className="border-l-4 border-orange-400 pl-3">
                    <div className="font-medium">Second Violation</div>
                    <div className="text-sm">24-hour posting restriction</div>
                  </div>
                  <div className="border-l-4 border-red-400 pl-3">
                    <div className="font-medium">Third Violation</div>
                    <div className="text-sm">7-day account suspension</div>
                  </div>
                  <div className="border-l-4 border-red-600 pl-3">
                    <div className="font-medium">Severe or Repeated Violations</div>
                    <div className="text-sm">Permanent account termination</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4.2 Immediate Termination</h4>
                <p className="text-sm mb-2">
                  The following violations may result in immediate account termination:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Creating multiple accounts to evade restrictions</li>
                  <li>Sharing malicious or phishing links</li>
                  <li>Harassment or threats to other users</li>
                  <li>Commercial spam or automated posting</li>
                  <li>Impersonating other businesses or individuals</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Legitimate Business Communication */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle className="h-5 w-5 mr-2" />
                5. Legitimate Business Communication
              </CardTitle>
            </CardHeader>
            <CardContent className="text-green-800 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">5.1 Allowed Promotional Content</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Industry-relevant training courses and workshops</li>
                  <li>Professional tools and equipment recommendations</li>
                  <li>Shop announcements and special events</li>
                  <li>Educational content that benefits the community</li>
                  <li>Authentic testimonials and success stories</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5.2 Best Practices</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Focus on educational value and community benefit</li>
                  <li>Use professional, conversational language</li>
                  <li>Engage authentically with community members</li>
                  <li>Limit promotional posts to once per week</li>
                  <li>Use platform messaging for direct business inquiries</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5.3 Professional Networking</h4>
                <p className="text-sm">
                  We encourage professional networking and business development. 
                  Use the platform's built-in messaging and networking features to 
                  connect with potential partners, employees, or collaborators.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reporting Spam */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flag className="h-5 w-5 mr-2 text-orange-600" />
                6. Reporting Spam and Violations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">6.1 How to Report</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Click the "Report" button on any post or message</li>
                  <li>Select the appropriate violation category</li>
                  <li>Provide additional context if necessary</li>
                  <li>Submit the report for review</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6.2 Report Categories</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>• Promotional Spam</div>
                  <div>• Contact Information Abuse</div>
                  <div>• Repetitive Content</div>
                  <div>• External Link Abuse</div>
                  <div>• Harassment</div>
                  <div>• Impersonation</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6.3 Response Time</h4>
                <p className="text-sm">
                  All reports are reviewed within 24 hours. High-priority reports 
                  (harassment, threats, malicious content) are prioritized for 
                  immediate review.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appeals Process */}
          <Card>
            <CardHeader>
              <CardTitle>7. Appeals Process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">7.1 Appealing Decisions</h4>
                <p className="text-sm mb-2">
                  If you believe content was incorrectly flagged or your account 
                  was unfairly restricted, you can appeal:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Email appeals@snipshift.com.au within 7 days</li>
                  <li>Include your account details and content in question</li>
                  <li>Provide context explaining why the decision was incorrect</li>
                  <li>Wait for review by senior moderation team</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">7.2 Appeal Review</h4>
                <p className="text-sm">
                  Appeals are reviewed by senior moderators within 5 business days. 
                  If your appeal is successful, any restrictions will be lifted and 
                  your account history will be updated accordingly.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <MessageSquare className="h-5 w-5 mr-2" />
                8. Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800">
              <div className="space-y-2 text-sm">
                <p><strong>Spam Reports:</strong> reports@snipshift.com.au</p>
                <p><strong>Appeals:</strong> appeals@snipshift.com.au</p>
                <p><strong>General Questions:</strong> moderation@snipshift.com.au</p>
                <p><strong>Urgent Issues:</strong> Use the in-platform emergency report feature</p>
              </div>
              <p className="text-sm mt-4">
                <strong>Response Time:</strong> Most inquiries are answered within 24 hours. 
                Emergency reports are prioritized for immediate attention.
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Footer */}
        <div className="text-center text-sm text-neutral-600">
          <p>
            This Anti-Spam Policy is part of our Terms of Service and is designed 
            to maintain a professional, valuable community for industry professionals.
          </p>
          <p className="mt-2">
            Last updated: September 2025 | Effective immediately for all users
          </p>
        </div>
      </div>
    </div>
  );
}