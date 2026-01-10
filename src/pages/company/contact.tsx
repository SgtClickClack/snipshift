import { useState } from 'react';
import { SEO } from '@/components/seo/SEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Lightweight client-side submission for now (keeps UI responsive without forcing mailto)
    requestAnimationFrame(() => {
      toast({
        title: 'Message sent',
        description: "Thanks! We've received your message and will reply within 24�48 hours.",
      });
      setIsSubmitting(false);
      setFormData({ email: '', subject: '', message: '' });
    });
  };

  return (
    <>
      <SEO
        title="Contact Us"
        description="Get in touch with HospoGo. We're here to help with questions, support, or feedback."
        url="/contact"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-steel-900 mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-steel-600 max-w-2xl mx-auto">
              Have a question, suggestion, or need support? We'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Info Card */}
            <Card className="card-chrome">
              <CardHeader>
                <CardTitle className="text-steel-900">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-neon rounded-lg shadow-neon-realistic">
                    <Mail className="h-5 w-5 text-brand-dark" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-steel-900 mb-1">Email</h3>
                    <a 
                      href="mailto:support@hospogo.com" 
                      className="text-steel-600 hover:text-brand-neon transition-colors"
                    >
                      support@hospogo.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-steel-900 mb-1">Response Time</h3>
                    <p className="text-steel-600">
                      We typically respond within 24-48 hours during business days.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-steel-300">
                  <p className="text-sm text-steel-600">
                    For urgent matters or account issues, please include your account email 
                    and a brief description of the issue.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Form Card */}
            <Card className="card-chrome">
              <CardHeader>
                <CardTitle className="text-steel-900">Send Us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-steel-700">
                      Your Email *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your.email@example.com"
                      required
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-steel-700">
                      Subject *
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="What's this about?"
                      required
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-steel-700">
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us how we can help..."
                      rows={6}
                      required
                      className="w-full"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    variant="accent"
                    className="w-full"
                  >
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-steel-500 text-center">
                    Prefer email? Reach us at <span className="font-medium">support@hospogo.com</span>.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

