import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShieldCheck } from 'lucide-react';

const faqs = [
  {
    question: "What is the HospoGo Trinity?",
    answer: "Our platform integrates three specialized logistics layers: **The Vault** (Automated Compliance), **The Market** (Vetted Labor), and **The Engine** (Rostering & Xero Sync).",
    icon: null
  },
  {
    question: "How are staff verified?",
    answer: "HospoGo utilizes **The Vault**, a cryptographic identity layer that performs real-time DVS (Document Verification Service) API handshakes. Compliance is gated by the engine automatically; we have eliminated the need for manual profile reviews.",
    icon: 'shield'
  },
  {
    question: "What is the Logistics Platform Fee?",
    answer: "HospoGo is a flat **$149/month** fee. We do not believe in 'Success Taxes'—your price stays the same regardless of how many staff you manage or how much you grow.",
    icon: null
  },
  {
    question: "Does this replace my current payroll software?",
    answer: "No. We provide a 1:1 Mutex-locked handshake with **Xero Payroll AU**. We handle the logistics and cost-tracking; Xero handles the final disbursements, ensuring 100% financial accuracy.",
    icon: null
  },
  {
    question: "What is Suburban Loyalty?",
    answer: "Our research shows suburban venues retain **4.6% higher customer loyalty** than CBD counterparts. HospoGo is optimized for these high-stability 'Neighborhood Locals' that require consistent, reliable staffing.",
    icon: null
  }
];

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
  icon?: 'shield' | null;
  id: string;
}

// Render markdown-style bold text (**text**) as <strong> elements
function renderAnswer(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function FAQItem({ question, answer, isOpen, onClick, icon, id }: FAQItemProps) {
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  const ariaExpanded = isOpen ? 'true' : 'false';
  const buttonContent = (
    <>
      <span className={`text-lg font-bold flex items-center gap-2 ${isOpen ? 'text-[#BAFF39]' : 'text-white'} group-hover:text-[#BAFF39]`}>
        {icon === 'shield' && <ShieldCheck className="w-5 h-5 text-[#BAFF39]" />}
        {question}
      </span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <ChevronDown className={`w-6 h-6 ${isOpen ? 'text-[#BAFF39]' : 'text-zinc-500'}`} />
      </motion.div>
    </>
  );

  return (
    <div className={`border-b transition-colors ${isOpen ? 'border-[#BAFF39]' : 'border-zinc-800'}`}>
      <button
        onClick={onClick}
        id={buttonId}
        className="w-full py-6 flex justify-between items-center text-left hover:text-[#BAFF39] transition-colors group"
        aria-expanded={ariaExpanded}
        aria-controls={panelId}
        aria-label={question}
        title={question}
      >
        {buttonContent}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
          >
            <p className="pb-6 text-zinc-400 leading-relaxed max-w-2xl">
              {renderAnswer(answer)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-black py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black tracking-tighter text-white mb-4">The Foundry FAQ</h2>
          <p className="text-zinc-500">Understand the architecture behind HospoGo.</p>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              icon={faq.icon === 'shield' ? 'shield' : null}
              id={`faq-${index}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
