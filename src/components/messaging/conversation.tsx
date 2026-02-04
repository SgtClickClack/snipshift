import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { messagingService } from '@/lib/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@shared/firebase-schema';
import { Send, ArrowLeft, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/useToast';

interface ConversationProps {
  chatId: string;
  otherUser: { id: string, name: string, role: string };
  onBack?: () => void;
}

// Extended Message type to include optimistic state
interface OptimisticMessage extends Message {
  isOptimistic?: boolean;
  error?: boolean;
  tempId?: string;
}

export default function Conversation({ chatId, otherUser, onBack }: ConversationProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['conversation-messages', chatId];

  // Fetch messages using React Query with polling
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey,
    queryFn: () => messagingService.getChatMessages(chatId),
    enabled: !!chatId && !!user,
    refetchInterval: 2000, // Poll every 2 seconds for new messages
  });

  // Mark messages as read when conversation is opened or messages change - with mounted check
  useEffect(() => {
    let isMounted = true;
    
    if (chatId && user && messages.length > 0) {
      messagingService.markMessagesAsRead(chatId, user.id).catch((error) => {
        if (isMounted) {
          console.error('Failed to mark messages as read:', error);
        }
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [chatId, user, messages.length]);

  // Mutation for sending messages with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const newMessage = await messagingService.sendMessage(chatId, user!.id, otherUser.id, content);
      return newMessage;
    },
    onMutate: async (content: string) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<Message[]>(queryKey) || [];

      // Optimistically update with temporary message
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const timestamp = new Date();
      const optimisticMessage: OptimisticMessage = {
        id: tempId,
        chatId,
        senderId: user!.id,
        content: content.trim(),
        timestamp: timestamp as any, // Firebase timestamp or Date
        read: false,
        isOptimistic: true,
        tempId,
      };

      queryClient.setQueryData<Message[]>(queryKey, (old = []) => [...old, optimisticMessage]);

      // Return context with snapshot and tempId for rollback
      return { previousMessages, tempId };
    },
    onError: (error: any, content: string, context) => {
      // Mark the optimistic message as errored (keep it visible for retry)
      queryClient.setQueryData<OptimisticMessage[]>(queryKey, (old = []) =>
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
    onSuccess: (data: Message, content: string, context) => {
      // Replace optimistic message with server response
      queryClient.setQueryData<Message[]>(queryKey, (old = []) => {
        const filtered = old.filter((msg) => (msg as OptimisticMessage).tempId !== context?.tempId);
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
    const failedMessage = messages.find((msg) => (msg as OptimisticMessage).tempId === tempId);
    if (failedMessage && !sendMessageMutation.isPending) {
      // Remove the failed message before retrying
      queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
        old.filter((msg) => (msg as OptimisticMessage).tempId !== tempId)
      );
      // Retry sending
      sendMessageMutation.mutate(failedMessage.content);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'HH:mm');
  };

  const formatMessageDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    
    const currentDate = currentMessage.timestamp?.toDate ? currentMessage.timestamp.toDate() : new Date(currentMessage.timestamp);
    const previousDate = previousMessage.timestamp?.toDate ? previousMessage.timestamp.toDate() : new Date(previousMessage.timestamp);
    
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
            <div className="flex flex-col items-center justify-center py-8" data-testid="text-no-messages">
              <EmptyState
                icon={MessageSquare}
                title="No messages yet - start a conversation!"
                description="Send a message to start the conversation and connect with your team."
              />
            </div>
          ) : (
            messages.map((message, index) => {
              const showDateSeparator = shouldShowDateSeparator(message, messages[index - 1]);
              const isFromCurrentUser = message.senderId === user.id;
              const optimisticMsg = message as OptimisticMessage;
              const isOptimistic = optimisticMsg.isOptimistic;
              const hasError = optimisticMsg.error;
              
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
                        {!isOptimistic && formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                    
                    {isFromCurrentUser && (
                      <Avatar className="h-6 w-6 mt-1">
                        {(user as any).avatarUrl && <AvatarImage src={(user as any).avatarUrl} />}
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
              disabled={sendMessageMutation.isPending}
              className="flex-1"
              data-testid="input-message"
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