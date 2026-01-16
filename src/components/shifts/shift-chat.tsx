/**
 * Shift Chat Component
 * 
 * Dedicated chat interface for shift-specific messaging between venue owner and assigned worker
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { shiftMessagingService, ShiftMessage } from '@/lib/shift-messaging';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { format } from 'date-fns';
import { useToast } from '@/hooks/useToast';

interface ShiftChatProps {
  shiftId: string;
  shiftTitle: string;
  otherUser: { id: string; name: string; role: string; avatarUrl?: string | null };
  onClose?: () => void;
}

// Extended ShiftMessage type to include optimistic state
interface OptimisticShiftMessage extends ShiftMessage {
  isOptimistic?: boolean;
  error?: boolean;
  tempId?: string;
}

export default function ShiftChat({ shiftId, shiftTitle, otherUser, onClose }: ShiftChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['shift-messages', shiftId];

  // Fetch messages using React Query with polling
  const { data: messages = [], isLoading } = useQuery<ShiftMessage[]>({
    queryKey,
    queryFn: () => shiftMessagingService.getShiftMessages(shiftId),
    enabled: !!shiftId && !!user,
    refetchInterval: 2000, // Poll every 2 seconds for new messages
  });

  // Mutation for sending messages with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const result = await shiftMessagingService.sendShiftMessage(shiftId, content);
      return result;
    },
    onMutate: async (content: string) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<ShiftMessage[]>(queryKey) || [];

      // Optimistically update with temporary message
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMessage: OptimisticShiftMessage = {
        id: tempId,
        shiftId,
        senderId: user!.id,
        recipientId: otherUser.id,
        content: content.trim(),
        readAt: null,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
        tempId,
      };

      queryClient.setQueryData<ShiftMessage[]>(queryKey, (old = []) => [...old, optimisticMessage]);

      // Return context with snapshot and tempId for rollback
      return { previousMessages, tempId };
    },
    onError: (error: any, content: string, context) => {
      // Mark the optimistic message as errored (keep it visible for retry)
      queryClient.setQueryData<OptimisticShiftMessage[]>(queryKey, (old = []) =>
        old.map((msg) =>
          msg.tempId === context?.tempId
            ? { ...msg, error: true, isOptimistic: true }
            : msg
        )
      );

      const errorMessage = error.message || 'Failed to send message';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
    onSuccess: (data: ShiftMessage | null, content: string, context) => {
      if (!data) return;

      // Replace optimistic message with server response
      queryClient.setQueryData<ShiftMessage[]>(queryKey, (old = []) => {
        const filtered = old.filter((msg) => (msg as OptimisticShiftMessage).tempId !== context?.tempId);
        return [...filtered, data];
      });
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendMessageMutation.isPending || !user) return;

    const content = newMessage.trim();
    setNewMessage('');
    sendMessageMutation.mutate(content);
  };

  const handleRetryFailedMessage = (tempId: string) => {
    const failedMessage = messages.find((msg) => (msg as OptimisticShiftMessage).tempId === tempId);
    if (failedMessage && !sendMessageMutation.isPending) {
      // Remove the failed message before retrying
      queryClient.setQueryData<ShiftMessage[]>(queryKey, (old = []) =>
        old.filter((msg) => (msg as OptimisticShiftMessage).tempId !== tempId)
      );
      // Retry sending
      sendMessageMutation.mutate(failedMessage.content);
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="shift-messages-container">
          {isLoading ? (
            <div className="flex justify-center py-8" data-testid="text-loading-messages">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div data-testid="text-no-messages">
              <EmptyState
                icon={MessageCircle}
                title="No messages yet"
                description="Send a message to coordinate logistics"
              />
            </div>
          ) : (
            messages.map((message, index) => {
              const showDateSeparator = shouldShowDateSeparator(message, messages[index - 1]);
              const isFromCurrentUser = message.senderId === user.id;
              const optimisticMsg = message as OptimisticShiftMessage;
              const isOptimistic = optimisticMsg.isOptimistic;
              const hasError = optimisticMsg.error;
              
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
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg relative ${
                        isFromCurrentUser
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      } ${isOptimistic ? 'opacity-70' : ''} ${hasError ? 'ring-2 ring-destructive' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm flex-1" data-testid={`message-content-${message.id}`}>
                          {message.content}
                        </div>
                        {isOptimistic && !hasError && (
                          <Loader2 className="h-3 w-3 animate-spin opacity-60" />
                        )}
                        {hasError && optimisticMsg.tempId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-destructive/20"
                            onClick={() => handleRetryFailedMessage(optimisticMsg.tempId)}
                            title="Retry sending"
                          >
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className={`text-xs mt-1 flex items-center gap-1 ${
                        isFromCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`} data-testid={`message-time-${message.id}`}>
                        {isOptimistic && !hasError && (
                          <span className="text-[10px]">Sending...</span>
                        )}
                        {hasError && (
                          <span className="text-[10px] text-destructive">Failed</span>
                        )}
                        {!isOptimistic && formatMessageTime(message.createdAt)}
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
              disabled={sendMessageMutation.isPending}
              className="flex-1"
              data-testid="input-message"
              maxLength={5000}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              size="sm"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
