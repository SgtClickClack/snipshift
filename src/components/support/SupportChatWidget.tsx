/**
 * SupportChatWidget - AI-Powered Support Chat Interface
 * 
 * A floating glassmorphism-style chat widget for logged-in users featuring:
 * - HospoGo Support Specialist AI assistant powered by Gemini
 * - Quick question chips for common inquiries
 * - Electric Lime (#BAFF39) "AI is Thinking" pulse animation
 * - Smooth expand/collapse animations
 * - LifeBuoy icon to distinguish from Investor Bot
 * 
 * Brand Colors:
 * - Neon: #BAFF39 (brand-neon)
 * - Dark BG: #0a0a0a
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LifeBuoy, 
  Send, 
  Sparkles,
  Bot,
  User,
  ChevronDown,
  HelpCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';

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
  { label: 'How do I connect Xero?', query: 'How do I connect my Xero account to HospoGo?' },
  { label: 'What is Smart Fill?', query: 'How does Invite A-Team / Smart Fill work?' },
  { label: 'Create a template', query: 'How do I create a Capacity Template for my roster?' },
  { label: 'Upload compliance docs', query: 'How do I upload compliance documents to The Vault?' },
];

/** Generate unique ID for messages */
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export default function SupportChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm the HospoGo Support Specialist. I can help you with rostering, Xero integration, compliance, and more. What can I help you with today?",
      timestamp: new Date(),
    },
  ]);
  const [sessionId] = useState(() => crypto.randomUUID());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // HOOK ORDER FIX: All hooks MUST be called before any conditional returns
  // This prevents React Error #310 ("Rendered fewer hooks than expected")
  
  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);
  
  // Listen for custom event to open chat from Help Center or other components
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-support-chat', handleOpenChat);
    return () => window.removeEventListener('open-support-chat', handleOpenChat);
  }, []);
  
  // BOT ISOLATION: Support bot is NEVER shown on Investor Portal
  // Investors should only see the Foundry Executive Agent (InvestorChatWidget)
  const isInvestorPortal = location.pathname.startsWith('/investorportal');
  
  // ONBOARDING GATE: Only render when user is authenticated AND has completed onboarding
  // This check is AFTER all hooks to maintain consistent hook count across renders
  const shouldRender = user && user.isOnboarded === true && !isInvestorPortal;
  
  // Query mutation
  const queryMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest('POST', '/api/support/query', {
        query,
        sessionId,
        context: {
          currentPage: window.location.pathname,
        },
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
      console.error('[SupportChat] Query error:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment, or visit our Help Center for self-service support.",
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
  
  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      await apiRequest('POST', '/api/support/clear-session', { sessionId });
    } catch (e) {
      // Ignore errors on session clear
    }
    setMessages([
      {
        id: 'welcome-new',
        role: 'assistant',
        content: "Starting fresh! How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  }, [sessionId]);
  
  // Early return AFTER all hooks have been called - maintains consistent hook count
  if (!shouldRender) {
    return null;
  }
  
  return (
    <>
      {/* Chat Widget Container */}
      {/* 
        POSITIONING: right-8 for main support bubble
        Z-INDEX HIERARCHY (standardized scale):
        - Base UI: --z-base
        - Chat Bubbles: --z-floating (this widget + InvestorChatWidget)
        - Navbar: --z-sticky
        - Modals/Overlays: --z-overlay / --z-modal
        
        Note: InvestorChatWidget uses right-24 to avoid overlap when both render on InvestorPortal.
        Feedback button relocated to Footer.tsx - no longer a floating FAB.
      */}
      <div 
        className={`fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:bottom-6 right-4 sm:right-8 z-[var(--z-floating)] transition-all duration-500 ${
          isOpen ? 'w-[calc(100vw-32px)] sm:w-[380px] sm:max-w-[calc(100vw-48px)]' : 'w-auto'
        }`}
      >
        {/* Expanded Chat Panel */}
        {isOpen && (
          <div 
            className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-[0_8px_60px_rgba(186,255,57,0.15)] overflow-hidden flex flex-col"
            style={{ 
              height: 'min(550px, calc(100vh - 120px))',
              animation: 'supportSlideIn 0.3s ease-out',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#BAFF39]/20 flex items-center justify-center">
                  <LifeBuoy className="w-5 h-5 text-[#BAFF39]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-white font-bold text-sm">Support Specialist</h3>
                    <span className="w-2 h-2 rounded-full bg-[#BAFF39] animate-pulse" title="Online" />
                  </div>
                  <p className="text-gray-500 text-xs">AI-Powered • 24/7 Support</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewConversation}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors group"
                  aria-label="New conversation"
                  title="Start new conversation"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors group"
                  aria-label="Close chat"
                >
                  <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>
            
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
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
                      <Bot className="w-4 h-4 text-[#BAFF39]" />
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
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
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
                      <span className="text-xs text-gray-500">Finding answer...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Quick Questions */}
            {messages.length <= 2 && !queryMutation.isPending && (
              <div className="px-4 pb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Quick Questions</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10 hover:border-[#BAFF39]/50 hover:text-[#BAFF39] transition-all"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Help Center Link */}
            <div className="px-4 pb-2">
              <Link 
                to="/help"
                className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-[#BAFF39] transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Browse Help Center</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            
            {/* Input Area */}
            <div className="p-3 border-t border-white/10 bg-black/50">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask a question..."
                  disabled={queryMutation.isPending}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#BAFF39]/50 transition-colors disabled:opacity-50"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || queryMutation.isPending}
                  className="px-3 py-2.5 rounded-xl bg-[#BAFF39] text-black hover:bg-[#BAFF39]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            className="group relative w-14 h-14 rounded-full bg-[#BAFF39] text-black flex items-center justify-center shadow-[0_4px_30px_rgba(186,255,57,0.4)] hover:shadow-[0_4px_40px_rgba(186,255,57,0.6)] transition-all duration-300 hover:scale-105"
            aria-label="Open support chat"
            style={{ animation: 'supportButtonPulse 3s ease-in-out infinite' }}
          >
            <LifeBuoy className="w-6 h-6 group-hover:scale-110 transition-transform" />
            
            {/* Help Badge */}
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
              <HelpCircle className="w-3 h-3 text-[#BAFF39]" />
            </span>
          </button>
        )}
      </div>
      
      {/* Keyframe Animations */}
      <style>{`
        @keyframes supportSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes supportButtonPulse {
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
