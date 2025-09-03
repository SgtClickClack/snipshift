import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { messagingService } from '@/lib/messaging';
import { authService } from '@/lib/auth';
import { Chat } from '@shared/firebase-schema';
import { MessageCircle, Search, User } from 'lucide-react';
import { format } from 'date-fns';

interface ChatListProps {
  onSelectChat: (chatId: string, otherUser: { id: string, name: string, role: string }) => void;
  selectedChatId?: string;
}

export default function ChatList({ onSelectChat, selectedChatId }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = messagingService.onChatsChange(user.id, (updatedChats) => {
      setChats(updatedChats);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const filteredChats = chats.filter(chat => {
    const otherParticipant = messagingService.getOtherParticipant(chat, user?.id || '');
    return otherParticipant?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatLastMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) {
    return <div>Please log in to view messages</div>;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messages
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-chats"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="text-loading-chats">
              <div className="text-muted-foreground">Loading conversations...</div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center" data-testid="text-no-chats">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
              <div className="text-muted-foreground">
                {searchTerm ? 'No conversations found' : 'No messages yet'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {searchTerm ? 'Try a different search term' : 'Start a conversation from a job application'}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredChats.map((chat) => {
                const otherParticipant = messagingService.getOtherParticipant(chat, user.id);
                if (!otherParticipant) return null;

                const unreadCount = chat.unreadCount?.[user.id] || 0;
                const isSelected = selectedChatId === chat.id;

                return (
                  <div
                    key={chat.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 ${
                      isSelected ? 'bg-muted border-l-primary' : 'border-l-transparent'
                    }`}
                    onClick={() => onSelectChat(chat.id, otherParticipant)}
                    data-testid={`chat-item-${chat.id}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`/api/placeholder/40/40`} />
                      <AvatarFallback>
                        {getInitials(otherParticipant.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate" data-testid={`chat-name-${chat.id}`}>
                            {otherParticipant.name}
                          </span>
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {otherParticipant.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs" data-testid={`unread-count-${chat.id}`}>
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground" data-testid={`chat-time-${chat.id}`}>
                            {formatLastMessageTime(chat.lastMessageTimestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        {chat.lastMessageSender === user.id && (
                          <span className="mr-1">You:</span>
                        )}
                        <span className="truncate" data-testid={`last-message-${chat.id}`}>
                          {chat.lastMessage || 'No messages yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}