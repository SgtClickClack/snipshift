import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Is there a lock-in contract?",
    answer: "No. All HospoGo plans are month-to-month. You can upgrade, downgrade, or cancel at any time directly from your dashboard."
  },
  {
    question: "How do you vet your staff?",
    answer: "Every 'Pro' undergoes a manual profile review. We verify relevant certifications (like RSA) and use a community-driven rating system to ensure high standards."
  },
  {
    question: "What happens if a staff member doesn't show up?",
    answer: "We have a zero-tolerance no-show policy. Our Smart-Fill technology instantly alerts nearby Pros, and your booking fee for that shift is automatically waived."
  },
  {
    question: "How fast can I find staff for an emergency shift?",
    answer: "Most emergency shifts are claimed within 60 minutes. Our platform is designed for the high-speed reality of the hospitality industry."
  },
  {
    question: "Are there any fees for staff?",
    answer: "No. The Professional plan for staff is Free Forever. You keep 100% of your hourly rate; we charge venues a subscription or booking fee to keep the platform running."
  }
];

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="border-b border-zinc-800">
      <button
        onClick={onClick}
        className="w-full py-6 flex justify-between items-center text-left hover:text-[#BFFF00] transition-colors group"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-bold text-white group-hover:text-[#BFFF00]">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className={`w-6 h-6 ${isOpen ? 'text-[#BFFF00]' : 'text-zinc-500'}`} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-zinc-400 leading-relaxed max-w-2xl">
              {answer}
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
    <section className="bg-black py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-white mb-4">Got Questions?</h2>
          <p className="text-zinc-500">Everything you need to know about HospoGo.</p>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
