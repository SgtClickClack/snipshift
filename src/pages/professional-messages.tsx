import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Search, Send, Paperclip, ArrowLeft, Circle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { SEO } from '@/components/seo/SEO';
import { EmptyState } from '@/components/ui/empty-state';

export interface ChatMessage {
  id: string;
  type: 'user' | 'salon' | 'system';
  content: string;
  timestamp: string;
  senderId?: string;
  senderName?: string;
}

export interface Conversation {
  id: string;
  salonId: string;
  salonName: string;
  salonAvatar?: string;
  isOnline: boolean;
  jobId?: string;
  jobTitle?: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export default function ProfessionalMessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = selectedConversationId
    ? conversations.find(c => c.id === selectedConversationId)
    : null;

  // Filter conversations based on search
  const filteredConversations = (conversations || []).filter(conv =>
    conv.salonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    if (selectedConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages]);

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowMobileChat(true);
  };

  // Handle back button on mobile
  const handleBackToList = () => {
    setShowMobileChat(false);
  };

  // Format timestamp for conversation list
  const formatConversationTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  // Format timestamp for messages
  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return format(date, 'HH:mm');
  };

  // Format date header for messages
  const formatMessageDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  // Get initials for avatar
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    // In a real app, this would send to the API
    // For now, we'll just clear the input
    setMessageInput('');
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    messages.forEach(message => {
      const messageDate = formatMessageDate(message.timestamp);
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: currentDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  if (!user || user.currentRole !== 'professional') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">This page is only available for pros.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <SEO title="Messages - Pro Dashboard" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Conversation List */}
        <div
          className={`${
            showMobileChat ? 'hidden' : 'flex'
          } md:flex flex-col w-full md:w-[30%] border-r border-border bg-card`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Messages</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <EmptyState
                  icon={MessageCircle}
                  title={searchQuery ? 'No conversations found' : 'No messages yet - start a conversation!'}
                  description={searchQuery
                    ? 'Try a different search term'
                    : 'Start a conversation from a job application to connect with professionals or venues.'}
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(filteredConversations || []).map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                      selectedConversationId === conversation.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={conversation.salonAvatar} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(conversation.salonName)}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.isOnline && (
                          <Circle className="absolute bottom-0 right-0 h-3 w-3 fill-green-500 text-green-500 border-2 border-card rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold truncate">{conversation.salonName}</p>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {conversation.unreadCount > 0 && (
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatConversationTime(conversation.lastMessageTimestamp)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div
          className={`${
            showMobileChat ? 'flex' : 'hidden'
          } md:flex flex-col flex-1 bg-background`}
        >
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={handleBackToList}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConversation.salonAvatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(selectedConversation.salonName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{selectedConversation.salonName}</p>
                      <div className="flex items-center gap-1">
                        <Circle
                          className={`h-2 w-2 ${
                            selectedConversation.isOnline
                              ? 'fill-green-500 text-green-500'
                              : 'fill-gray-400 text-gray-400'
                          }`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {selectedConversation.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    {selectedConversation.jobTitle && (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs text-primary"
                        onClick={() => navigate(`/jobs/${selectedConversation.jobId}`)}
                      >
                        View Job: {selectedConversation.jobTitle}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No messages yet</p>
                    <p className="text-sm mt-2">Start the conversation!</p>
                  </div>
                ) : (
                  groupMessagesByDate(selectedConversation?.messages || []).map((group, groupIndex) => (
                    <div key={groupIndex}>
                      {/* Date Header */}
                      <div className="flex items-center justify-center my-4">
                        <div className="px-3 py-1 bg-muted rounded-full">
                          <span className="text-xs text-muted-foreground">{group.date}</span>
                        </div>
                      </div>

                      {/* Messages */}
                      {(group.messages || []).map((message) => {
                        if (message.type === 'system') {
                          return (
                            <div key={message.id} className="flex items-center justify-center my-2">
                              <div className="px-3 py-1 bg-muted rounded-full">
                                <span className="text-xs text-muted-foreground">
                                  {message.content} - {formatMessageTime(message.timestamp)}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        const isMe = message.type === 'user';
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}
                          >
                            <div
                              className={`max-w-[70%] min-w-0 rounded-lg px-4 py-2 ${
                                isMe
                                  ? 'bg-primary text-primary-foreground rounded-tr-none'
                                  : 'bg-muted text-foreground rounded-tl-none'
                              }`}
                            >
                              {!isMe && (
                                <p className="text-xs font-semibold mb-1 opacity-80">
                                  {message.senderName}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <p
                                className={`text-xs mt-1 ${
                                  isMe
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {formatMessageTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    size="icon"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

