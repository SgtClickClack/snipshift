import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/hooks/useToast';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Mail, Briefcase, Flag } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { ReportButton } from '@/components/report/report-button';
import { SEO } from '@/components/seo/SEO';

interface Conversation {
  id: string;
  jobId?: string;
  otherParticipant: {
    id: string;
    name: string;
    email: string;
  } | null;
  latestMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  job: {
    id: string;
    title: string;
  } | null;
  lastMessageAt?: string;
  createdAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
}

interface ConversationDetail {
  conversation: {
    id: string;
    jobId?: string;
    participant1Id: string;
    participant2Id: string;
    lastMessageAt?: string;
    createdAt: string;
  };
  otherParticipant: {
    id: string;
    name: string;
    email: string;
  } | null;
  job: {
    id: string;
    title: string;
  } | null;
  messages: Message[];
}

async function fetchConversations(): Promise<Conversation[]> {
  const res = await apiRequest('GET', '/api/conversations');
  return res.json();
}

async function fetchConversationDetail(id: string): Promise<ConversationDetail> {
  const res = await apiRequest('GET', `/api/conversations/${id}`);
  return res.json();
}

async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const res = await apiRequest('POST', '/api/messages', { conversationId, content });
  return res.json();
}

async function markAsRead(conversationId: string): Promise<void> {
  await apiRequest('PATCH', `/api/conversations/${conversationId}/read`, {});
}

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedConversationId = searchParams.get('conversation');
  const [messageContent, setMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isConnected, joinConversation, leaveConversation, sendMessage: socketSendMessage, onMessage, onError } = useSocket();

  // Fetch conversations list (no polling - real-time updates via socket)
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    queryFn: fetchConversations,
    enabled: !!user,
  });

  // Fetch selected conversation detail (no polling - real-time updates via socket)
  const { data: conversationDetail, isLoading: isLoadingDetail } = useQuery<ConversationDetail>({
    queryKey: ['/api/conversations', selectedConversationId],
    queryFn: () => fetchConversationDetail(selectedConversationId!),
    enabled: !!selectedConversationId && !!user,
  });

  // Join conversation room when selected
  useEffect(() => {
    if (selectedConversationId && isConnected) {
      joinConversation(selectedConversationId);
      return () => {
        leaveConversation(selectedConversationId);
      };
    }
  }, [selectedConversationId, isConnected, joinConversation, leaveConversation]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (selectedConversationId && conversationDetail) {
      markAsRead(selectedConversationId).catch((error) => {
        console.error("Failed to mark as read", error);
        toast({
          title: "Error",
          description: "Failed to mark messages as read",
          variant: "destructive",
        });
      });
    }
  }, [selectedConversationId, conversationDetail, toast]);

  // Listen for real-time messages via Socket.io
  useEffect(() => {
    const unsubscribe = onMessage((message: Message) => {
      // Update conversation detail if this message belongs to the current conversation
      if (message.conversationId === selectedConversationId) {
        queryClient.setQueryData<ConversationDetail>(
          ['/api/conversations', selectedConversationId],
          (oldData) => {
            if (!oldData) return oldData;
            // Check if message already exists (avoid duplicates)
            const messageExists = oldData.messages.some((m) => m.id === message.id);
            if (messageExists) return oldData;
            return {
              ...oldData,
              messages: [...oldData.messages, message],
            };
          }
        );
      }
      // Refresh conversations list to update latest message
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    });

    return unsubscribe;
  }, [selectedConversationId, onMessage, queryClient]);

  // Listen for socket errors
  useEffect(() => {
    const unsubscribe = onError((error) => {
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to connect to messaging service',
        variant: 'destructive',
      });
    });

    return unsubscribe;
  }, [onError, toast]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationDetail?.messages]);

  const handleSendMessage = () => {
    if (!selectedConversationId || !messageContent.trim() || !isConnected) {
      if (!isConnected) {
        toast({
          title: 'Connection Error',
          description: 'Not connected to messaging service. Please wait...',
          variant: 'destructive',
        });
      }
      return;
    }

    // Send via Socket.io for real-time delivery
    socketSendMessage(selectedConversationId, messageContent.trim());
    setMessageContent('');
    
    // Optimistically update UI (socket will send the actual message)
    // The socket event handler will update the UI when the message is confirmed
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectConversation = (conversationId: string) => {
    setSearchParams({ conversation: conversationId });
  };

  if (isLoadingConversations) {
    return <PageLoadingFallback />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Messages" />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Messages</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Communicate with employers and candidates
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          {/* Sidebar - Conversations List */}
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-lg">Conversations</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm mt-2">Start a conversation from a job application</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {(conversations || []).map((conv) => {
                      const isSelected = conv.id === selectedConversationId;
                      const unreadCount = 0; // Could be calculated from latestMessage

                      return (
                        <button
                          key={conv.id}
                          onClick={() => selectConversation(conv.id)}
                          className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                            isSelected ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {conv.otherParticipant?.name
                                  ?.split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold truncate">
                                  {conv.otherParticipant?.name || 'Unknown User'}
                                </p>
                                {conv.latestMessage && (
                                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                    {formatMessageTime(conv.latestMessage.createdAt)}
                                  </span>
                                )}
                              </div>
                              {conv.job && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Briefcase className="h-3 w-3 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground truncate">
                                    {conv.job.title}
                                  </p>
                                </div>
                              )}
                              {conv.latestMessage && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {conv.latestMessage.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2 flex flex-col overflow-hidden">
            {!selectedConversationId ? (
              <CardContent className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the sidebar to start messaging</p>
                </div>
              </CardContent>
            ) : isLoadingDetail ? (
              <CardContent className="flex-1 flex items-center justify-center">
                <PageLoadingFallback />
              </CardContent>
            ) : !conversationDetail ? (
              <CardContent className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-muted-foreground">
                  <p>Conversation not found</p>
                </div>
              </CardContent>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {conversationDetail.otherParticipant?.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {conversationDetail.otherParticipant?.name || 'Unknown User'}
                      </p>
                      {conversationDetail.job && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {conversationDetail.job.title}
                        </p>
                      )}
                    </div>
                    {conversationDetail.otherParticipant && (
                      <ReportButton
                        reportedId={conversationDetail.otherParticipant.id}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Report
                      </ReportButton>
                    )}
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversationDetail.messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No messages yet</p>
                      <p className="text-sm mt-2">Start the conversation!</p>
                    </div>
                  ) : (
                    (conversationDetail?.messages || []).map((message) => {
                      const isMe = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] min-w-0 rounded-lg px-4 py-2 ${
                              isMe
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {!isMe && (
                              <p className="text-xs font-semibold mb-1 opacity-80">
                                {message.sender.name}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}
                            >
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      disabled={!isConnected}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageContent.trim() || !isConnected}
                      size="icon"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

