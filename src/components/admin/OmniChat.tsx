/**
 * OmniChat - HospoGo Architect (God-Mode)
 * 
 * A Gemini-powered chatbot for the CTO Dashboard with full access to
 * HospoGo's technical and business DNA.
 * 
 * Features:
 * - Electric Lime (#BAFF39) glow effect for chat bubble
 * - Urbanist 900 for headings, Inter for body text
 * - Brisbane 100 investor-ready aesthetic
 * - Introspective Analysis mode for explaining unfamiliar code
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  Code2,
  FileSearch,
  Zap,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Clock,
} from 'lucide-react';

type ChatMode = 'concise' | 'detailed' | 'introspective';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryType?: string;
  responseTimeMs?: number;
}

const MODE_CONFIG: Record<ChatMode, { label: string; icon: React.ReactNode; description: string }> = {
  concise: {
    label: 'Concise',
    icon: <Zap className="h-3 w-3" />,
    description: 'Quick, direct answers',
  },
  detailed: {
    label: 'Detailed',
    icon: <FileSearch className="h-3 w-3" />,
    description: 'Full explanations with file paths',
  },
  introspective: {
    label: 'Introspective',
    icon: <Code2 className="h-3 w-3" />,
    description: 'Analyze code you didn\'t write',
  },
};

export default function OmniChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>('detailed');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest('POST', '/api/admin/chat', {
        query,
        sessionId,
        mode,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to process query' }));
        throw new Error(error.message || 'Failed to process query');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Update session ID if this is first message
      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }
      
      // Add assistant response
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          queryType: data.queryType,
          responseTimeMs: data.responseTimeMs,
        },
      ]);
    },
    onError: (error: Error) => {
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error:** ${error.message}\n\nPlease try again or rephrase your question.`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  // Handle send
  const handleSend = useCallback(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput || chatMutation.isPending) return;

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmedInput,
        timestamp: new Date(),
      },
    ]);

    // Clear input
    setInput('');

    // Send to API
    chatMutation.mutate(trimmedInput);
  }, [input, chatMutation]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear session
  const handleClearSession = useCallback(async () => {
    if (sessionId) {
      try {
        await apiRequest('DELETE', `/api/admin/chat/${sessionId}`);
      } catch {
        // Ignore errors
      }
    }
    setMessages([]);
    setSessionId(null);
  }, [sessionId]);

  // Format message content (simple markdown-like formatting)
  const formatContent = (content: string) => {
    // Convert **bold** to <strong>
    let formatted = content.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>');
    // Convert `code` to <code>
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-800 text-[#BAFF39] font-mono text-sm">$1</code>');
    // Convert code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, 
      '<pre class="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto my-2"><code class="text-sm font-mono text-zinc-300">$2</code></pre>'
    );
    // Convert newlines to <br> (but not inside code blocks)
    formatted = formatted.replace(/\n(?![^<]*<\/pre>)/g, '<br />');
    
    return formatted;
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            className="fixed bottom-6 right-6 sm:right-24 z-40 p-4 rounded-full bg-zinc-900 border-2 border-[#BAFF39]/50 shadow-[0_0_30px_rgba(186,255,57,0.3)] hover:shadow-[0_0_40px_rgba(186,255,57,0.5)] transition-all duration-300 group"
            data-testid="omnichat-trigger"
            title="Open HospoGo Architect"
          >
            <Brain className="h-6 w-6 text-[#BAFF39] group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#BAFF39] animate-pulse" />
          </button>
        </DialogTrigger>

        <DialogContent 
          className={`bg-zinc-950/95 backdrop-blur-xl border border-[#BAFF39]/30 shadow-[0_0_60px_rgba(186,255,57,0.15)] p-0 gap-0 transition-all duration-300 ${
            isExpanded 
              ? 'max-w-4xl h-[85vh]' 
              : 'max-w-xl h-[600px]'
          }`}
        >
          {/* Header */}
          <DialogHeader className="p-4 border-b border-zinc-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#BAFF39]/20 border border-[#BAFF39]/30">
                  <Brain className="h-5 w-5 text-[#BAFF39]" />
                </div>
                <div>
                  <DialogTitle 
                    className="text-white text-lg tracking-tight"
                    style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 900 }}
                  >
                    HospoGo Architect
                  </DialogTitle>
                  <DialogDescription className="text-zinc-500 text-xs">
                    God-Mode • Full Codebase Access
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Mode Selector */}
                <Select value={mode} onValueChange={(v) => setMode(v as ChatMode)}>
                  <SelectTrigger className="w-32 h-8 bg-zinc-800 border-zinc-700 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {Object.entries(MODE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        <div className="flex items-center gap-2">
                          {config.icon}
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Expand/Collapse */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8 p-0 text-zinc-500 hover:text-white hover:bg-zinc-800"
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                
                {/* Clear Session */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSession}
                  className="h-8 w-8 p-0 text-zinc-500 hover:text-amber-400 hover:bg-zinc-800"
                  title="Clear conversation"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Mode Description */}
            <div className="mt-2 px-1">
              <Badge 
                variant="outline" 
                className="bg-[#BAFF39]/10 text-[#BAFF39] border-[#BAFF39]/30 text-[10px] gap-1"
              >
                {MODE_CONFIG[mode].icon}
                {MODE_CONFIG[mode].description}
              </Badge>
            </div>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <Sparkles className="h-12 w-12 mx-auto text-[#BAFF39]/30" />
                  <div>
                    <p className="text-zinc-400 text-sm">Ask me anything about HospoGo</p>
                    <p className="text-zinc-600 text-xs mt-1">
                      I have full access to the codebase, business logic, and system metrics.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {[
                      'How does Smart Fill work?',
                      'Explain the Xero Mutex',
                      'What is the Reliability Crown?',
                      'Where is ARR calculated?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700 text-xs text-zinc-400 hover:text-[#BAFF39] hover:border-[#BAFF39]/50 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[#BAFF39]/20 border border-[#BAFF39]/30 text-white'
                        : 'bg-zinc-800/50 border border-zinc-700 text-zinc-300'
                    }`}
                  >
                    {/* User message */}
                    {message.role === 'user' && (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    
                    {/* Assistant message */}
                    {message.role === 'assistant' && (
                      <>
                        <div 
                          className="text-sm prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                        />
                        {message.queryType && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-700">
                            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
                              {message.queryType.replace(/_/g, ' ')}
                            </Badge>
                            {message.responseTimeMs && (
                              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {message.responseTimeMs}ms
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin text-[#BAFF39]" />
                      <span className="text-sm">Analyzing codebase...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-zinc-800 flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the codebase, business logic, or system metrics..."
                className="flex-1 min-h-[44px] max-h-[120px] bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                className="bg-[#BAFF39] text-zinc-900 hover:bg-[#BAFF39]/90 h-11 px-4"
                title="Send message"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Footer */}
            <div className="mt-2 flex justify-center">
              <span className="text-[10px] text-zinc-600 tracking-wider">
                Powered by <span className="font-black italic">HOSPO<span className="text-[#BAFF39]">GO</span></span> × Gemini 2.0
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
