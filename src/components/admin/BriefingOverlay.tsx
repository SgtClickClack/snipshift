import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Crown,
  Cpu,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type SlideLayout = 'standard' | 'engine' | 'financials' | 'walkthrough';

interface BriefingSlide {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  layout: SlideLayout;
  highlights?: string[];
}

/**
 * Boardroom presentation overlay for the CTO Dashboard.
 * Provides a 10-slide investor narrative with keyboard + UI navigation.
 */
export default function BriefingOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const slides = useMemo<BriefingSlide[]>(
    () => [
      {
        id: 'genesis',
        kicker: 'Slide 1',
        title: 'Genesis',
        subtitle: 'From Dojo Pool to HospoGo B2B',
        layout: 'standard',
        highlights: [
          'Initial marketplace learnings revealed a logistics gap, not a gig gap.',
          'Pivot: build the engine behind staffing, not just the marketplace.',
          'Outcome: HospoGo becomes the logistics OS for hospitality.',
        ],
      },
      {
        id: 'brisbane-100',
        kicker: 'Slide 2',
        title: 'The Brisbane 100 Strategy',
        subtitle: 'A pilot market designed for ARR validation',
        layout: 'standard',
        highlights: [
          '100 venues × $149/mo × 12 = $178,800 ARR baseline.',
          'Suburban-first rollout to maximize retention and predictability.',
          'Pilot creates repeatable playbooks for national expansion.',
        ],
      },
      {
        id: 'engine',
        kicker: 'Slide 3',
        title: 'The Engine',
        subtitle: 'Suburban Loyalty & Xero Mutex logic',
        layout: 'engine',
      },
      {
        id: 'financials',
        kicker: 'Slide 4',
        title: 'Financials',
        subtitle: 'Live ARR metrics and reliability crowns',
        layout: 'financials',
      },
      {
        id: 'walkthrough',
        kicker: 'Slide 5',
        title: 'App Walkthrough',
        subtitle: 'Integrated Logistics Engine views',
        layout: 'walkthrough',
      },
      {
        id: 'compliance',
        kicker: 'Slide 6',
        title: 'Compliance Vault',
        subtitle: 'Government-grade verification with audit trail',
        layout: 'standard',
        highlights: [
          'DVS handshake, RSA enforcement, and immutable audit trails.',
          'Verified professionals earn the Reliability Crown.',
          'Compliance state surfaces in every operational decision.',
        ],
      },
      {
        id: 'self-healing',
        kicker: 'Slide 7',
        title: 'Self-Healing Intelligence',
        subtitle: 'Every gap becomes fuel for the next 100 venues',
        layout: 'standard',
        highlights: [
          'Brain Monitor logs knowledge gaps in real time.',
          'CTO can patch the manual; the system learns instantly.',
          'Demonstrates a compounding knowledge advantage.',
        ],
      },
      {
        id: 'resilience',
        kicker: 'Slide 8',
        title: 'Network Resilience',
        subtitle: 'Session recovery, offline empathy, and continuity',
        layout: 'standard',
        highlights: [
          'Hydration gate prevents auth storms; no 401 loops.',
          'Offline mode preserves state and syncs on reconnect.',
          'Designed for conference rooms and unstable Wi-Fi.',
        ],
      },
      {
        id: 'scale',
        kicker: 'Slide 9',
        title: 'Scale Flywheel',
        subtitle: 'Brisbane → National expansion mechanics',
        layout: 'standard',
        highlights: [
          'Pilot playbook replicates across 5,000 venues.',
          'ARR grows linearly with venue count, not headcount.',
          'Data moat deepens as the engine learns suburban demand.',
        ],
      },
      {
        id: 'closing',
        kicker: 'Slide 10',
        title: 'Boardroom Close',
        subtitle: 'The Logistics Engine is already operational',
        layout: 'standard',
        highlights: [
          'Live product, live metrics, verified retention logic.',
          'Execution-ready for Brisbane 100 with clear ARR path.',
          'HospoGo becomes the default operating system for venues.',
        ],
      },
    ],
    []
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= slides.length) return;
      setDirection(nextIndex > activeIndex ? 1 : -1);
      setActiveIndex(nextIndex);
    },
    [activeIndex, slides.length]
  );

  const handleNext = useCallback(() => {
    goToIndex(activeIndex + 1);
  }, [activeIndex, goToIndex]);

  const handlePrev = useCallback(() => {
    goToIndex(activeIndex - 1);
  }, [activeIndex, goToIndex]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'ArrowRight') handleNext();
      if (event.key === 'ArrowLeft') handlePrev();
      if (event.key === 'Escape') onClose();
    },
    [handleNext, handlePrev, isOpen, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown, isOpen]);

  const activeSlide = slides[activeIndex];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-[20px]">
      <div className="relative h-full w-full p-4 sm:p-8">
        <div className="mx-auto flex h-full max-w-6xl flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/40">
                BOARDROOM BRIEFING
              </Badge>
              <span className="text-sm text-zinc-400">
                {activeIndex + 1} / {slides.length}
              </span>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
              aria-label="Close boardroom mode"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 shadow-[0_0_60px_rgba(204,255,0,0.12)]">
            <div className="relative h-full overflow-hidden p-6 sm:p-10">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={activeSlide.id}
                  custom={direction}
                  initial={{ opacity: 0, x: 80 * direction }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -80 * direction }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex h-full flex-col"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-zinc-500">
                        {activeSlide.kicker}
                      </p>
                      <h2 className="mt-2 text-3xl sm:text-4xl text-white tracking-tight font-urbanist-900">
                        {activeSlide.title}
                      </h2>
                      <p className="mt-2 text-zinc-400">{activeSlide.subtitle}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={handlePrev}
                        disabled={activeIndex === 0}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                        aria-label="Previous slide"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleNext}
                        disabled={activeIndex === slides.length - 1}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                        aria-label="Next slide"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-8 flex-1">
                    {activeSlide.layout === 'standard' && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          {activeSlide.highlights?.map((item) => (
                            <div
                              key={item}
                              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-300"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                        <div className="rounded-2xl border border-[#CCFF00]/30 bg-gradient-to-br from-[#CCFF00]/15 via-transparent to-transparent p-5">
                          <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-[#CCFF00]" />
                            <h3 className="text-white font-semibold">Boardroom Signal</h3>
                          </div>
                          <p className="mt-3 text-sm text-zinc-400">
                            The engine is already operational — these slides are a live narrative,
                            not a pitch deck mockup.
                          </p>
                          <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                            <span className="rounded-full bg-[#CCFF00]/20 px-3 py-1 text-[#CCFF00]">
                              Electric Lime
                            </span>
                            <span className="rounded-full bg-zinc-800 px-3 py-1">Urbanist 900</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSlide.layout === 'engine' && (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-[#CCFF00]/30 bg-zinc-900/60 p-5">
                          <div className="flex items-center gap-3">
                            <Brain className="h-5 w-5 text-[#CCFF00]" />
                            <h3 className="text-white font-semibold">Suburban Loyalty Engine</h3>
                          </div>
                          <p className="mt-3 text-sm text-zinc-400">
                            Predictable suburban demand yields 4.6% higher retention and
                            92–98 loyalty scores in our algorithmic index.
                          </p>
                          <div className="mt-4 flex gap-3">
                            <Badge className="bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/40">
                              92–98 Stability
                            </Badge>
                            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              +4.6% Retention
                            </Badge>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-blue-500/30 bg-zinc-900/60 p-5">
                          <div className="flex items-center gap-3">
                            <Cpu className="h-5 w-5 text-blue-400" />
                            <h3 className="text-white font-semibold">Xero Mutex Logic</h3>
                          </div>
                          <p className="mt-3 text-sm text-zinc-400">
                            Exactly-once payroll delivery with 30s advisory locks, SHA-256
                            reconciliation, and audit-safe traceability.
                          </p>
                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-400">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                              <p className="text-[#CCFF00] font-semibold">Mutex TTL</p>
                              <p className="mt-1">30 seconds</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                              <p className="text-[#CCFF00] font-semibold">SHA-256</p>
                              <p className="mt-1">Bidirectional Hash</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSlide.layout === 'financials' && (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-[#CCFF00]/30 bg-gradient-to-br from-[#CCFF00]/15 via-transparent to-transparent p-6">
                          <p className="text-xs uppercase tracking-widest text-zinc-500">
                            Projected ARR
                          </p>
                          <p className="mt-2 text-4xl font-black text-[#CCFF00]">$178,800</p>
                          <p className="mt-3 text-sm text-zinc-400">
                            Brisbane 100 baseline with weighted pipeline.
                          </p>
                          <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-zinc-400">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                              <p className="text-[#CCFF00] font-semibold">Committed ARR</p>
                              <p className="mt-1">$89,400</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                              <p className="text-amber-300 font-semibold">Pipeline ARR</p>
                              <p className="mt-1">$35,760</p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                          <div className="flex items-center gap-3">
                            <Crown className="h-5 w-5 text-[#CCFF00]" />
                            <h3 className="text-white font-semibold">Reliability Crown</h3>
                          </div>
                          <p className="mt-3 text-sm text-zinc-400">
                            Professionals with 0 strikes and 10+ shifts earn the crown — visible
                            signal of trust and a priority ranking boost.
                          </p>
                          <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#CCFF00]/30 bg-[#CCFF00]/10 p-4">
                            <ShieldCheck className="h-5 w-5 text-[#CCFF00]" />
                            <div>
                              <p className="text-sm text-white font-semibold">Elite Professional</p>
                              <p className="text-xs text-zinc-400">0 strikes • 10+ shifts</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSlide.layout === 'walkthrough' && (
                      <div className="grid gap-6 lg:grid-cols-2">
                        {['Logistics Engine — Calendar Ops', 'Logistics Engine — Revenue & Sync'].map(
                          (label) => (
                            <div
                              key={label}
                              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
                            >
                              <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span>{label}</span>
                                <span className="rounded-full bg-[#CCFF00]/10 px-2 py-0.5 text-[#CCFF00]">
                                  LIVE CAPTURE
                                </span>
                              </div>
                              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                  <span className="h-2 w-2 rounded-full bg-[#CCFF00]" />
                                  <span>Logistics Engine</span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-300">
                                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                                    <p className="text-[#CCFF00] font-semibold">Smart Fill</p>
                                    <p className="mt-2 text-zinc-500">Realtime staffing loop</p>
                                  </div>
                                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                                    <p className="text-[#CCFF00] font-semibold">Compliance Vault</p>
                                    <p className="mt-2 text-zinc-500">DVS + RSA verified</p>
                                  </div>
                                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                                    <p className="text-[#CCFF00] font-semibold">Xero Mutex</p>
                                    <p className="mt-2 text-zinc-500">Atomic payroll sync</p>
                                  </div>
                                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                                    <p className="text-[#CCFF00] font-semibold">ARR Engine</p>
                                    <p className="mt-2 text-zinc-500">$178,800 baseline</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Target className="h-3 w-3 text-[#CCFF00]" />
              Use ← → arrows to navigate slides
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={activeIndex === 0}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-900"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={activeIndex === slides.length - 1}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-900"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
