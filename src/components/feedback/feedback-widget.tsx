import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, X, Send } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";

interface FeedbackData {
  type: string;
  message: string;
  page: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  userRole?: string;
}

/** 
 * FeedbackWidget - Modal-based feedback form
 * 
 * REFACTORED: Floating FAB removed. Trigger now lives in Footer.tsx as a standard button.
 * This component only renders the modal when isOpen is true.
 */
export function FeedbackWidget({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [feedbackType, setFeedbackType] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackType || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a feedback type and enter your message.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type: feedbackType,
      message: message.trim(),
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userRole: user?.currentRole || undefined
    };

    try {
      // In a real app, this would send to your feedback API
      
      // Store locally for now (in production, send to server)
      const existingFeedback = JSON.parse(localStorage.getItem("user-feedback") || "[]");
      existingFeedback.push(feedbackData);
      localStorage.setItem("user-feedback", JSON.stringify(existingFeedback));

      toast({
        title: "Feedback Sent",
        description: "Thank you for your feedback! We'll review it shortly."
      });

      // Reset form
      setMessage("");
      setFeedbackType("");
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only render modal when open
  if (!isOpen) return null;

  return (
    <>
      {/* Feedback modal */}
      <div className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-wrap gap-2">
            <CardTitle className="text-lg">Send Feedback</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-feedback"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-type">Feedback Type</Label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger data-testid="select-feedback-type">
                    <SelectValue placeholder="Select feedback type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="improvement">Improvement Suggestion</SelectItem>
                    <SelectItem value="compliment">Compliment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-message">Your Feedback</Label>
                <Textarea
                  id="feedback-message"
                  placeholder="Tell us what you think, what's not working, or how we can improve..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  data-testid="textarea-feedback-message"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel-feedback"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !feedbackType || !message.trim()}
                  data-testid="button-submit-feedback"
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}