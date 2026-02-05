/**
 * InvestorChatWidget - AI-Powered Investor Chat Interface
 * 
 * A floating glassmorphism-style chat widget for the investor portal featuring:
 * - Foundry Agent AI assistant powered by Gemini
 * - Quick question chips for common investor inquiries
 * - Electric Lime (#BAFF39) "AI is Thinking" pulse animation
 * - Smooth expand/collapse animations
 * 
 * Brand Colors:
 * - Neon: #BAFF39 (brand-neon)
 * - Dark BG: #0a0a0a
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'react-router-dom';
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles,
  Bot,
  User,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Chat message type */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  questionType?: string;
}

/** Quick question chip data */
interface QuickQuestion {
  label: string;
  query: string;
}

const QUICK_QUESTIONS: QuickQuestion[] = [
  { label: 'What is the Trinity?', query: 'What is the HospoGo Trinity Architecture and how does it work?' },
  { label: 'Explain the Xero Handshake', query: 'How does the Xero Handshake integration and financial synchronization work?' },
  { label: 'Why Suburban Loyalty?', query: 'Explain the Suburban Loyalty strategy and why HospoGo is targeting suburban venues.' },
  { label: 'The Ask', query: 'What are the terms of the current seed round investment opportunity?' },
];

/** Generate unique ID for messages */
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export default function InvestorChatWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to the HospoGo Investor Portal. I'm the Foundry Executive Agent—your AI liaison grounded in our audited prospectus and strategic data. How can I help you explore the $1M seed opportunity today?",
      timestamp: new Date(),
    },
  ]);
  const [sessionId] = useState(() => crypto.randomUUID());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // Focus input when chat opens - with proper cleanup
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);
  
  // Query mutation
  const queryMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest('POST', '/api/investors/query', {
        query,
        sessionId,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }
      return res.json();
    },
    onSuccess: (data: { answer: string; questionType: string }) => {
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        questionType: data.questionType,
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error: Error) => {
      console.error('[InvestorChat] Query error:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your inquiry at the moment. Please try again, or feel free to reach out to our team directly at the investor briefing.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });
  
  // Handle sending a message
  const handleSend = useCallback((query?: string) => {
    const messageText = query || inputValue.trim();
    if (!messageText || queryMutation.isPending) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Send to API
    queryMutation.mutate(messageText);
  }, [inputValue, queryMutation]);
  
  // Handle quick question click
  const handleQuickQuestion = useCallback((question: QuickQuestion) => {
    handleSend(question.query);
  }, [handleSend]);
  
  // Handle input key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  // BOT ISOLATION: Investor bot is ONLY shown on Investor Portal
  // This is a safety check - component is only rendered in InvestorPortal.tsx anyway
  // Ensures capital-raising agent never appears on venue/staff pages
  if (!location.pathname.startsWith('/investorportal')) {
    return null;
  }
  
  return (
    <>
      {/* Chat Widget Container - Primary floating CTA for investor queries */}
      {/* 
        POSITIONING: right-24 (96px) - offset from SupportChatWidget (right-8)
        Z-INDEX HIERARCHY (coordinated with SupportChatWidget & Navbar):
        - Base UI: z-0
        - Chat Bubbles: z-40 (this widget + SupportChatWidget)
        - Navbar: z-50
        - Modals/Data Room: z-100+
        
        Note: SupportChatWidget uses right-8 to avoid overlap when both render on InvestorPortal.
        Feedback button relocated to Footer.tsx - no longer a floating FAB.
      */}
      <div 
        className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-24 z-40 transition-all duration-500 ${
          isOpen ? 'w-[calc(100vw-32px)] sm:w-[400px] sm:max-w-[calc(100vw-48px)]' : 'w-auto'
        }`}
      >
        {/* Expanded Chat Panel */}
        {isOpen && (
          <div 
            className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-[0_8px_60px_rgba(186,255,57,0.15)] overflow-hidden flex flex-col"
            style={{ 
              height: 'min(600px, calc(100vh - 120px))',
              animation: 'chatSlideIn 0.3s ease-out',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#BAFF39]/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#BAFF39]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-white font-bold text-sm">Foundry Executive Agent</h3>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#BAFF39]" title="Grounded in audited data" />
                  </div>
                  <p className="text-gray-500 text-xs">AI Investor Liaison • Audited Intelligence</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors group"
                aria-label="Close chat"
              >
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>
            
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div 
                    className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-white/10' 
                        : 'bg-[#BAFF39]/20'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-[#BAFF39]" />
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[#BAFF39] text-black rounded-tr-sm'
                        : 'bg-white/5 text-gray-200 rounded-tl-sm border border-white/5'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    {message.questionType && message.role === 'assistant' && (
                      <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-gray-500">
                        {message.questionType}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Thinking Indicator */}
              {queryMutation.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#BAFF39]/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#BAFF39] animate-pulse" />
                  </div>
                  <div className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span 
                          className="w-2 h-2 bg-[#BAFF39] rounded-full animate-bounce" 
                          style={{ animationDelay: '0ms' }} 
                        />
                        <span 
                          className="w-2 h-2 bg-[#BAFF39] rounded-full animate-bounce" 
                          style={{ animationDelay: '150ms' }} 
                        />
                        <span 
                          className="w-2 h-2 bg-[#BAFF39] rounded-full animate-bounce" 
                          style={{ animationDelay: '300ms' }} 
                        />
                      </div>
                      <span className="text-xs text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Quick Questions */}
            {messages.length <= 2 && !queryMutation.isPending && (
              <div className="px-5 pb-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Quick Questions</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10 hover:border-[#BAFF39]/50 hover:text-[#BAFF39] transition-all"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/50">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about the investment..."
                  disabled={queryMutation.isPending}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#BAFF39]/50 transition-colors disabled:opacity-50"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || queryMutation.isPending}
                  className="px-4 py-3 rounded-xl bg-[#BAFF39] text-black hover:bg-[#BAFF39]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Floating Chat Button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative w-16 h-16 rounded-full bg-[#BAFF39] text-black flex items-center justify-center shadow-[0_4px_30px_rgba(186,255,57,0.4)] hover:shadow-[0_4px_40px_rgba(186,255,57,0.6)] transition-all duration-300 hover:scale-105"
            aria-label="Open chat"
            style={{ animation: 'chatButtonPulse 2s ease-in-out infinite' }}
          >
            <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
            
            {/* Notification Badge */}
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-3 h-3 text-[#BAFF39]" />
            </span>
          </button>
        )}
      </div>
      
      {/* Keyframe Animations */}
      <style>{`
        @keyframes chatSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes chatButtonPulse {
          0%, 100% {
            box-shadow: 0 4px 30px rgba(186, 255, 57, 0.4);
          }
          50% {
            box-shadow: 0 4px 40px rgba(186, 255, 57, 0.6);
          }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #BAFF39;
        }
      `}</style>
    </>
  );
}
