/**
 * Shift Chat Component
 * 
 * Dedicated chat interface for shift-specific messaging between venue owner and assigned worker
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { shiftMessagingService, ShiftMessage } from '@/lib/shift-messaging';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/useToast';

interface ShiftChatProps {
  shiftId: string;
  shiftTitle: string;
  otherUser: { id: string; name: string; role: string; avatarUrl?: string | null };
  onClose?: () => void;
}

export default function ShiftChat({ shiftId, shiftTitle, otherUser, onClose }: ShiftChatProps) {
  const [messages, setMessages] = useState<ShiftMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!shiftId || !user) return;

    const unsubscribe = shiftMessagingService.onShiftMessagesChange(shiftId, (updatedMessages) => {
      setMessages(updatedMessages);
      setIsLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [shiftId, user]);

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
    setError(null);
    try {
      await shiftMessagingService.sendShiftMessage(shiftId, newMessage.trim());
      setNewMessage('');
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage = error.message || 'Failed to send message';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, 'HH:mm');
  };

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const shouldShowDateSeparator = (currentMessage: ShiftMessage, previousMessage?: ShiftMessage) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);
    
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Please log in to view messages</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Shift Chat</CardTitle>
              <p className="text-sm text-muted-foreground">{shiftTitle}</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={otherUser.avatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(otherUser.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            Chatting with {otherUser.name}
          </span>
          <Badge variant="secondary" className="text-xs">
            {otherUser.role}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 mx-4 mt-2 rounded">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="shift-messages-container">
          {isLoading ? (
            <div className="flex justify-center py-8" data-testid="text-loading-messages">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="text-no-messages">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <div className="text-muted-foreground mb-2">No messages yet</div>
              <div className="text-sm text-muted-foreground">Send a message to coordinate logistics</div>
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
                        {formatMessageDate(message.createdAt)}
                      </span>
                    </div>
                  )}
                  
                  <div
                    className={`flex gap-2 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${message.id}`}
                  >
                    {!isFromCurrentUser && (
                      <Avatar className="h-6 w-6 mt-1">
                        <AvatarImage src={otherUser.avatarUrl || undefined} />
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
                        {formatMessageTime(message.createdAt)}
                      </div>
                    </div>
                    
                    {isFromCurrentUser && (
                      <Avatar className="h-6 w-6 mt-1">
                        <AvatarImage src={user.photoURL || user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.displayName || user.name || user.email || 'U')}
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
              maxLength={5000}
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
