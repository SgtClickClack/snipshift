import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bug, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Info,
  User,
  Monitor,
  Globe
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ErrorReportingProps {
  error: Error;
  errorId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function ErrorReporting({ 
  error, 
  errorId, 
  onClose, 
  onSubmitted 
}: ErrorReportingProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    steps: '',
    frequency: '',
    impact: '',
    includeScreenshot: true,
    includeSystemInfo: true,
    includeConsoleLogs: true
  });

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const errorReport = {
        errorId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        user: {
          id: user?.id,
          email: user?.email,
          role: user?.currentRole
        },
        system: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          screen: {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language
        },
        report: {
          description: formData.description,
          steps: formData.steps,
          frequency: formData.frequency,
          impact: formData.impact,
          includeScreenshot: formData.includeScreenshot,
          includeSystemInfo: formData.includeSystemInfo,
          includeConsoleLogs: formData.includeConsoleLogs
        }
      };

      // In a real app, this would send to your error reporting service
      console.log('Error report submitted:', errorReport);
      
      // Store locally for now
      const existingReports = JSON.parse(localStorage.getItem('error-reports') || '[]');
      existingReports.push(errorReport);
      localStorage.setItem('error-reports', JSON.stringify(existingReports));

      setIsSubmitted(true);
      onSubmitted?.();
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (reportError) {
      console.error('Failed to submit error report:', reportError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="error-report-success">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-lg text-steel-900">
            Report Submitted
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-steel-600">
            Thank you for reporting this error. Our team will investigate and work on a fix.
          </p>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Error ID: {errorId}
            </AlertDescription>
          </Alert>
          <p className="text-sm text-steel-500">
            This window will close automatically...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="error-report-form">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <Bug className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Report Error</CardTitle>
            <p className="text-sm text-steel-600">Help us fix this issue</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error.message}
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="description" className="text-sm font-medium">
            What were you trying to do? *
          </Label>
          <Textarea
            id="description"
            placeholder="Describe what you were doing when this error occurred..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-2 min-h-[80px]"
            data-testid="error-description"
          />
        </div>

        <div>
          <Label htmlFor="steps" className="text-sm font-medium">
            Steps to reproduce (optional)
          </Label>
          <Textarea
            id="steps"
            placeholder="1. Go to... 2. Click on... 3. Error occurs..."
            value={formData.steps}
            onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
            className="mt-2 min-h-[60px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">How often?</Label>
            <Select 
              value={formData.frequency} 
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first-time">First time</SelectItem>
                <SelectItem value="sometimes">Sometimes</SelectItem>
                <SelectItem value="often">Often</SelectItem>
                <SelectItem value="always">Always</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Impact</Label>
            <Select 
              value={formData.impact} 
              onValueChange={(value) => setFormData({ ...formData, impact: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Include additional information:</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="system-info"
              checked={formData.includeSystemInfo}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, includeSystemInfo: !!checked })
              }
            />
            <Label htmlFor="system-info" className="text-sm flex items-center">
              <Monitor className="h-4 w-4 mr-2" />
              System information
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="console-logs"
              checked={formData.includeConsoleLogs}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, includeConsoleLogs: !!checked })
              }
            />
            <Label htmlFor="console-logs" className="text-sm flex items-center">
              <Bug className="h-4 w-4 mr-2" />
              Console logs
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="screenshot"
              checked={formData.includeScreenshot}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, includeScreenshot: !!checked })
              }
            />
            <Label htmlFor="screenshot" className="text-sm flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Screenshot
            </Label>
          </div>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!formData.description.trim() || isSubmitting}
            data-testid="submit-error-report"
          >
            {isSubmitting ? (
              <>
                <Send className="h-4 w-4 mr-2 animate-pulse" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Report
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-steel-500 text-center">
          Error ID: {errorId}
        </p>
      </CardContent>
    </Card>
  );
}
