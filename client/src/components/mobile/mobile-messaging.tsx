import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Send, 
  Plus, 
  Search, 
  MoreVertical,
  Phone,
  Video,
  Paperclip
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Chat {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
}

export default function MobileMessaging() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);

  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ['/api/messages/chats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/messages/chats');
      return response.json();
    }
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages', selectedChatId],
    queryFn: async () => {
      if (!selectedChatId) return [];
      const response = await apiRequest('GET', `/api/messages/${selectedChatId}`);
      return response.json();
    },
    enabled: !!selectedChatId
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      const response = await apiRequest('POST', `/api/messages/${chatId}`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/chats'] });
      setNewMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChatId) return;
    
    sendMessageMutation.mutate({
      chatId: selectedChatId,
      content: newMessage.trim()
    });
  };

  const handleBackToList = () => {
    setSelectedChatId(null);
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleLongPress = (messageId: string) => {
    setShowMessageMenu(messageId);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Message copied",
      description: "Message copied to clipboard",
    });
    setShowMessageMenu(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    // Implement message deletion
    toast({
      title: "Message deleted",
      description: "Message has been deleted",
    });
    setShowMessageMenu(null);
  };

  const selectedChat = chats.find((chat: Chat) => chat.id === selectedChatId);

  if (selectedChatId && selectedChat) {
    return (
      <div className="flex flex-col h-full" data-testid="mobile-chat-interface">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={handleBackToList}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={selectedChat.otherUser.avatar} />
              <AvatarFallback>
                {selectedChat.otherUser.firstName[0]}{selectedChat.otherUser.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {selectedChat.otherUser.firstName} {selectedChat.otherUser.lastName}
              </p>
              <p className="text-xs text-steel-600">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="mobile-messages-list">
          {messagesLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-steel-600 mx-auto"></div>
              <p className="mt-2 text-steel-600">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-steel-600">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message: Message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.senderId === user?.id
                      ? 'bg-steel-600 text-white'
                      : 'bg-steel-100 text-steel-900'
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleLongPress(message.id);
                  }}
                  data-testid="mobile-message-bubble"
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === user?.id ? 'text-steel-200' : 'text-steel-600'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1"
              data-testid="mobile-message-input"
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              data-testid="mobile-send-button"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Message Context Menu */}
        {showMessageMenu && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 w-64">
              <h3 className="font-medium mb-3">Message Options</h3>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleCopyMessage(messages.find((m: Message) => m.id === showMessageMenu)?.content || "")}
                  data-testid="mobile-copy-message"
                >
                  Copy Message
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600"
                  onClick={() => handleDeleteMessage(showMessageMenu)}
                  data-testid="mobile-delete-message"
                >
                  Delete Message
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setShowMessageMenu(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="mobile-messages-list">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <h1 className="text-xl font-bold text-steel-900">Messages</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewChat(true)}
          data-testid="mobile-new-chat"
        >
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-steel-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chatsLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-steel-600 mx-auto"></div>
            <p className="mt-2 text-steel-600">Loading conversations...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-steel-600">No conversations yet</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setShowNewChat(true)}
            >
              Start a Conversation
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {chats
              .filter((chat: Chat) => 
                chat.otherUser.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                chat.otherUser.lastName.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((chat: Chat) => (
                <Card 
                  key={chat.id} 
                  className="cursor-pointer hover:bg-steel-50 transition-colors"
                  onClick={() => handleSelectChat(chat.id)}
                  data-testid="mobile-chat-item"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={chat.otherUser.avatar} />
                          <AvatarFallback>
                            {chat.otherUser.firstName[0]}{chat.otherUser.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        {chat.unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-steel-900 truncate">
                            {chat.otherUser.firstName} {chat.otherUser.lastName}
                          </p>
                          <p className="text-xs text-steel-600">
                            {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        <p className="text-sm text-steel-600 truncate">
                          {chat.lastMessage.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm" data-testid="mobile-new-chat-modal">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">New Chat</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowNewChat(false)}>
                  ×
                </Button>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <Input
                  placeholder="Search users..."
                  data-testid="mobile-user-search"
                />
                <Button className="w-full" data-testid="mobile-search-users">
                  Search Users
                </Button>
                <div className="space-y-2">
                  <div className="p-3 border rounded-lg cursor-pointer hover:bg-steel-50" data-testid="mobile-user-result">
                    <p className="font-medium">John Doe</p>
                    <p className="text-sm text-steel-600">Professional Barber</p>
                  </div>
                </div>
                <Button className="w-full" data-testid="mobile-start-chat">
                  Start Chat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
