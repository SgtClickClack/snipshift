import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, Building2, Users, Mail, Phone, MessageSquare, User, Sparkles } from 'lucide-react';

interface FormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  numberOfLocations: string;
  message: string;
  inquiryType: string;
}

interface FormErrors {
  companyName?: string;
  email?: string;
  general?: string;
}

export default function ContactSalesForm() {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    numberOfLocations: '',
    message: '',
    inquiryType: 'enterprise_plan',
  });

  // Capture inquiry type from URL param and map to valid enum values
  useEffect(() => {
    const inquiry = searchParams.get('inquiry');
    if (inquiry) {
      // Map URL param values to valid enum values
      const inquiryTypeMap: Record<string, string> = {
        'enterprise': 'enterprise_plan',
        'enterprise_plan': 'enterprise_plan',
        'custom': 'custom_solution',
        'custom_solution': 'custom_solution',
        'partnership': 'partnership',
        'general': 'general',
      };
      const mappedType = inquiryTypeMap[inquiry] || 'enterprise_plan';
      setFormData(prev => ({ ...prev, inquiryType: mappedType }));
    }
  }, [searchParams]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        numberOfLocations: formData.numberOfLocations ? parseInt(formData.numberOfLocations, 10) : undefined,
        message: formData.message.trim() || undefined,
        inquiryType: formData.inquiryType,
      };

      const response = await fetch('/api/leads/enterprise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to submit form');
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({
        general: error instanceof Error
          ? error.message
          : 'Something went wrong. Give it another shot or reach out to us at info@hospogo.com.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Success state with premium styling
  if (isSubmitted) {
    return (
      <div 
        id="enterprise_lead_form"
        className="relative bg-zinc-900 border border-zinc-800 p-10 rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#BAFF39]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#BAFF39]/10 rounded-full blur-3xl" />
        
        <div className="relative text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#BAFF39]/20 rounded-full mb-6 ring-4 ring-[#BAFF39]/30">
            <CheckCircle2 className="w-10 h-10 text-[#BAFF39]" />
          </div>
          <h3 className="text-3xl font-black text-white mb-4">Message Sent!</h3>
          <div className="text-[#BAFF39] font-bold text-lg p-4 bg-[#BAFF39]/10 rounded-xl border border-[#BAFF39]/20 inline-block">
            Our hospitality partnerships manager will reach out within 24 hours.
          </div>
          <p className="text-zinc-500 text-sm mt-6">
            Check your inbox for a confirmation email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="enterprise_lead_form"
      className="relative bg-zinc-900 border border-zinc-800 p-10 rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto overflow-hidden"
    >
      {/* Subtle glow effects */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#BAFF39]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#BAFF39]/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative">
        {/* Header with badge */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#BAFF39]/10 border border-[#BAFF39]/20 rounded-full text-[#BAFF39] text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            ENTERPRISE SOLUTIONS
          </div>
          <h2 className="text-3xl font-black text-white mb-3">
            Talk to Our Enterprise Team
          </h2>
          <p className="text-zinc-400 text-lg">
            Scale your hospitality staffing across multiple locations with HospoGo Enterprise.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Two-column grid for larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name - Required */}
            <div className="md:col-span-2">
              <label htmlFor="companyName" className="block text-sm font-semibold text-zinc-300 mb-2">
                Company Name <span className="text-[#BAFF39]">*</span>
              </label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-[#BAFF39] transition-colors" />
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Your company name"
                  className={`w-full bg-black/50 border-2 ${
                    errors.companyName ? 'border-red-500' : 'border-zinc-800 focus:border-[#BAFF39]'
                  } text-white rounded-xl p-4 pl-12 outline-none transition-all placeholder:text-zinc-600`}
                  required
                />
              </div>
              {errors.companyName && (
                <p className="mt-2 text-sm text-red-400">{errors.companyName}</p>
              )}
            </div>

            {/* Contact Name */}
            <div>
              <label htmlFor="contactName" className="block text-sm font-semibold text-zinc-300 mb-2">
                Your Name
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-[#BAFF39] transition-colors" />
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full bg-black/50 border-2 border-zinc-800 text-white rounded-xl p-4 pl-12 focus:border-[#BAFF39] outline-none transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Email - Required */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-zinc-300 mb-2">
                Work Email <span className="text-[#BAFF39]">*</span>
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-[#BAFF39] transition-colors" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className={`w-full bg-black/50 border-2 ${
                    errors.email ? 'border-red-500' : 'border-zinc-800 focus:border-[#BAFF39]'
                  } text-white rounded-xl p-4 pl-12 outline-none transition-all placeholder:text-zinc-600`}
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-zinc-300 mb-2">
                Phone Number
              </label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-[#BAFF39] transition-colors" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+61 400 000 000"
                  className="w-full bg-black/50 border-2 border-zinc-800 text-white rounded-xl p-4 pl-12 focus:border-[#BAFF39] outline-none transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Number of Locations */}
            <div>
              <label htmlFor="numberOfLocations" className="block text-sm font-semibold text-zinc-300 mb-2">
                Number of Locations
              </label>
              <div className="relative group">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-[#BAFF39] transition-colors" />
                <input
                  type="number"
                  id="numberOfLocations"
                  name="numberOfLocations"
                  value={formData.numberOfLocations}
                  onChange={handleChange}
                  placeholder="e.g. 5+"
                  min="1"
                  className="w-full bg-black/50 border-2 border-zinc-800 text-white rounded-xl p-4 pl-12 focus:border-[#BAFF39] outline-none transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>
          </div>

          {/* Message - Full width */}
          <div>
            <label htmlFor="message" className="block text-sm font-semibold text-zinc-300 mb-2">
              Message
            </label>
            <div className="relative group">
              <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-zinc-500 group-focus-within:text-[#BAFF39] transition-colors" />
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us about your staffing needs..."
                rows={4}
                className="w-full bg-black/50 border-2 border-zinc-800 text-white rounded-xl p-4 pl-12 focus:border-[#BAFF39] outline-none transition-all resize-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Hidden inquiry type field - captured from URL */}
          <input type="hidden" name="inquiryType" value={formData.inquiryType} />

          {/* General Error */}
          {errors.general && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Submit Button with glow effect */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#BAFF39] text-black font-black py-4 rounded-xl hover:shadow-[0_0_30px_rgba(186,255,57,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2 text-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              'Get in Touch'
            )}
          </button>

          <p className="text-xs text-zinc-500 text-center">
            By submitting this form, you agree to be contacted by our team about HospoGo Enterprise solutions.
          </p>
        </form>
      </div>
    </div>
  );
}
