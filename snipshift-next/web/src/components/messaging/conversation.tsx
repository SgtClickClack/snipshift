import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { messagingService } from '@/lib/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@shared/types';
import { Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface ConversationProps {
  chatId: string;
  otherUser: { id: string, name: string, role: string };
  onBack?: () => void;
}

export default function Conversation({ chatId, otherUser, onBack }: ConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!chatId) return;

    // Mark messages as read when opening conversation
    messagingService.markMessagesAsRead(chatId, user?.id || '');

    const unsubscribe = messagingService.onMessagesChange(chatId, (updatedMessages) => {
      setMessages(updatedMessages);
      setIsLoading(false);
      // Mark messages as read when new ones arrive
      setTimeout(() => {
        messagingService.markMessagesAsRead(chatId, user?.id || '');
      }, 1000);
    });

    return unsubscribe;
  }, [chatId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !user) return;

    setIsSending(true);
    try {
      await messagingService.sendMessage(chatId, user.id, otherUser.id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const normalizeTimestamp = (timestamp: any): Date => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return timestamp instanceof Date ? timestamp : new Date(timestamp);
  };

  const formatMessageTime = (timestamp: any) => {
    const date = normalizeTimestamp(timestamp);
    return format(date, 'HH:mm');
  };

  const formatMessageDate = (timestamp: any) => {
    const date = normalizeTimestamp(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    
    const currentDate = normalizeTimestamp((currentMessage as any).timestamp);
    const previousDate = normalizeTimestamp((previousMessage as any).timestamp);
    
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) {
    return <div>Please log in to view messages</div>;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Avatar className="h-8 w-8">
            <AvatarImage src={`/api/placeholder/32/32`} />
            <AvatarFallback className="text-xs">
              {getInitials(otherUser.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base" data-testid="text-other-user-name">
              {otherUser.name}
            </CardTitle>
            <Badge variant="secondary" className="text-xs" data-testid="text-other-user-role">
              {otherUser.role}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
          {isLoading ? (
            <div className="flex justify-center py-8" data-testid="text-loading-messages">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="text-no-messages">
              <div className="text-muted-foreground mb-2">No messages yet</div>
              <div className="text-sm text-muted-foreground">Send a message to start the conversation</div>
            </div>
          ) : (
            messages.map((message, index) => {
              const showDateSeparator = shouldShowDateSeparator(message, messages[index - 1]);
              const isFromCurrentUser = message.senderId === user.id;
              
              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center py-2">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full" data-testid={`date-separator-${index}`}>
                        {formatMessageDate(message.timestamp)}
                      </span>
                    </div>
                  )}
                  
                  <div
                    className={`flex gap-2 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${message.id}`}
                  >
                    {!isFromCurrentUser && (
                      <Avatar className="h-6 w-6 mt-1">
                        <AvatarImage src={`/api/placeholder/24/24`} />
                        <AvatarFallback className="text-xs">
                          {getInitials(otherUser.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                        isFromCurrentUser
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm" data-testid={`message-content-${message.id}`}>
                        {message.content}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isFromCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`} data-testid={`message-time-${message.id}`}>
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                    
                    {isFromCurrentUser && (
                      <Avatar className="h-6 w-6 mt-1">
                        <AvatarImage src={`/api/placeholder/24/24`} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.displayName || user.email)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1"
              data-testid="input-message"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              size="sm"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}