import { 
  LayoutDashboard, 
  Receipt, 
  Users2, 
  Headset,
  Clock,
  BadgeCheck,
  Sparkles
} from 'lucide-react';

const benefits = [
  {
    icon: LayoutDashboard,
    title: 'Centralized Management',
    description: 'Manage rosters across 50+ locations from a single high-level dashboard.',
  },
  {
    icon: Receipt,
    title: 'Unified Billing',
    description: 'One monthly invoice for your entire group. Simplified accounting for HQ.',
  },
  {
    icon: Users2,
    title: 'Preferred Pro Lists',
    description: "Build a 'Group Roster' of staff who know your brand and can float between venues.",
  },
  {
    icon: Headset,
    title: 'Dedicated Success Manager',
    description: 'Direct line to our team for custom onboarding and site-specific training.',
  },
];

const stats = [
  { value: '50+', label: 'Venues Managed' },
  { value: '98%', label: 'Fill Rate' },
  { value: '<24h', label: 'Response Time' },
];

export default function EnterpriseBenefits() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#BAFF39]/10 border border-[#BAFF39]/20 rounded-full text-[#BAFF39] text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          WHY ENTERPRISE
        </div>
        <h2 className="text-3xl font-black text-white mb-3">
          Scalable Talent for Hospitality Groups
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          From single venues to national chains, HospoGo Enterprise gives your operations team the tools to scale staffing. No admin headache.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between py-4 px-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl font-black text-[#BAFF39]">{stat.value}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Benefits list */}
      <div className="space-y-4">
        {benefits.map((benefit, index) => (
          <div 
            key={index}
            className="group flex items-start gap-4 p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-[#BAFF39]/30 hover:bg-zinc-900 transition-all duration-300"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#BAFF39]/10 flex items-center justify-center group-hover:bg-[#BAFF39]/20 transition-colors">
              <benefit.icon className="w-6 h-6 text-[#BAFF39]" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">{benefit.title}</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div className="pt-6 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-4">
          <BadgeCheck className="w-4 h-4 text-[#BAFF39]" />
          <span>Trusted by leading hospitality groups</span>
        </div>
        <div className="flex items-center gap-6 opacity-60">
          {/* Placeholder logos - replace with actual partner logos */}
          <div className="text-zinc-500 font-bold text-sm tracking-wider">MERIVALE</div>
          <div className="text-zinc-500 font-bold text-sm tracking-wider">SOLOTEL</div>
          <div className="text-zinc-500 font-bold text-sm tracking-wider">APPLEJACK</div>
        </div>
      </div>

      {/* Quick response promise */}
      <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <Clock className="w-5 h-5 text-[#BAFF39] flex-shrink-0" />
        <span className="text-zinc-400 text-sm">
          We respond to all inquiries within <span className="text-white font-semibold">24 hours</span>
        </span>
      </div>
    </div>
  );
}
