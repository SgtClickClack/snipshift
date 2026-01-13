import { 
  Building2, 
  Users, 
  Shield, 
  Zap, 
  HeadphonesIcon, 
  BarChart3,
  Clock,
  BadgeCheck
} from 'lucide-react';

const benefits = [
  {
    icon: Building2,
    title: 'Multi-Location Management',
    description: 'Manage staffing across all your venues from a single dashboard.',
  },
  {
    icon: Users,
    title: 'Dedicated Talent Pool',
    description: 'Access pre-vetted hospitality professionals who know your brand.',
  },
  {
    icon: Shield,
    title: 'Compliance & Insurance',
    description: 'All workers are RSA certified with comprehensive coverage.',
  },
  {
    icon: Zap,
    title: 'Instant Fill Rates',
    description: 'Fill last-minute shifts in under 2 hours with Smart Fill.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Priority Support',
    description: 'Dedicated account manager and 24/7 emergency support line.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Track performance, costs, and optimize your staffing strategy.',
  },
];

const stats = [
  { value: '2hr', label: 'Avg. Fill Time' },
  { value: '98%', label: 'Fill Rate' },
  { value: '4.9★', label: 'Worker Rating' },
];

export default function EnterpriseBenefits() {
  return (
    <div className="space-y-8">
      {/* Stats bar */}
      <div className="flex items-center justify-center gap-8 py-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl font-black text-[#BFFF00]">{stat.value}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Benefits grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {benefits.map((benefit, index) => (
          <div 
            key={index}
            className="group flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-[#BFFF00]/30 hover:bg-zinc-900 transition-all duration-300"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#BFFF00]/10 flex items-center justify-center group-hover:bg-[#BFFF00]/20 transition-colors">
              <benefit.icon className="w-5 h-5 text-[#BFFF00]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">{benefit.title}</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div className="pt-6 border-t border-zinc-800">
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs mb-4">
          <BadgeCheck className="w-4 h-4 text-[#BFFF00]" />
          <span>Trusted by leading hospitality groups</span>
        </div>
        <div className="flex items-center justify-center gap-6 opacity-50">
          {/* Placeholder logos - replace with actual partner logos */}
          <div className="text-zinc-600 font-bold text-sm tracking-wider">MERIVALE</div>
          <div className="text-zinc-600 font-bold text-sm tracking-wider">SOLOTEL</div>
          <div className="text-zinc-600 font-bold text-sm tracking-wider">APPLEJACK</div>
        </div>
      </div>

      {/* Quick response promise */}
      <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
        <Clock className="w-4 h-4" />
        <span>We respond to all inquiries within 24 hours</span>
      </div>
    </div>
  );
}
