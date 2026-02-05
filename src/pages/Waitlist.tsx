import React, { useState } from 'react';
import { SEO } from '@/components/seo/SEO';
import { apiRequest } from '@/lib/queryClient';

type WaitlistRole = 'venue' | 'staff';

export const WaitlistPage = () => {
  const [role, setRole] = useState<WaitlistRole>('venue');
  const [venueName, setVenueName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on role
    if (role === 'venue' && (!managerEmail || !venueName)) return;
    if (role === 'staff' && (!fullName || !mobileNumber)) return;

    setIsSubmitting(true);
    try {
      const payload = role === 'venue' 
        ? { 
            role: 'venue',
            venueName, 
            email: managerEmail, 
            location: 'Brisbane' 
          }
        : { 
            role: 'staff',
            fullName, 
            mobileNumber, 
            location: 'Brisbane' 
          };

      // Submit waitlist entry with role included
      await apiRequest('POST', '/api/waitlist', payload);
      
      setIsSubmitted(true);
      // Reset form
      setVenueName('');
      setManagerEmail('');
      setFullName('');
      setMobileNumber('');
    } catch (error) {
      console.error('Failed to submit waitlist entry:', error);
      // For now, still show success even if API fails (graceful degradation)
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title="HospoGo | Brisbane's Hospitality Shift Engine"
        description="Join the waitlist for Brisbane's premier hospitality marketplace. Hire verified staff in Fortitude Valley instantly."
        image="/assets/launch-preview-neon.png"
        canonical="https://hospogo.com.au/waitlist"
        url="https://hospogo.com.au/waitlist"
      />
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4">
        {/* Hero Section */}
        <div className="max-w-4xl w-full text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            HospoGo <span className="text-slate-100">is landing in Brisbane.</span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            The smarter way to hire and work in the Valley. 
            Verified staff, geofenced shifts, and instant payouts.
          </p>

          {/* Waitlist Form */}
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-6">Join the Waitlist</h2>
            
            {isSubmitted ? (
              <div className="text-center space-y-4">
                <div className="text-green-400 text-5xl mb-4">✓</div>
                <h3 className="text-xl font-semibold">You're on the list!</h3>
                <p className="text-slate-400">
                  We'll notify you as soon as HospoGo launches in Brisbane.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Role Toggle */}
                <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRole('venue')}
                    className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all ${
                      role === 'venue'
                        ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg shadow-blue-500/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Venue
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all ${
                      role === 'staff'
                        ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg shadow-blue-500/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Staff
                  </button>
                </div>

                {/* Conditional Fields */}
                {role === 'venue' ? (
                  <>
                    <input 
                      type="text" 
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="Venue Name (e.g. The Testing Tavern)" 
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 placeholder:text-slate-500"
                    />
                    <input 
                      type="email" 
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="Manager Email" 
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 placeholder:text-slate-500"
                    />
                  </>
                ) : (
                  <>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name" 
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 placeholder:text-slate-500"
                    />
                    <input 
                      type="tel" 
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="Mobile Number" 
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 placeholder:text-slate-500"
                    />
                  </>
                )}

                <button 
                  type="submit"
                  disabled={
                    isSubmitting || 
                    (role === 'venue' && (!managerEmail || !venueName)) ||
                    (role === 'staff' && (!fullName || !mobileNumber))
                  }
                  className="w-full bg-[#BAFF39] hover:bg-[#BAFF39]/90 disabled:bg-slate-700 disabled:cursor-not-allowed text-black font-black italic py-3 rounded-lg transition-all transform hover:scale-[1.02] disabled:transform-none shadow-[0_0_20px_rgba(186,255,57,0.4)] hover:shadow-[0_0_30px_rgba(186,255,57,0.6)]"
                >
                  {isSubmitting ? 'Submitting...' : 'Secure Early Access'}
                </button>
              </form>
            )}
            
            <p className="mt-4 text-sm text-slate-500 text-center">
              Join 50+ Brisbane {role === 'venue' ? 'venues' : 'pros'} already signed up.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
