import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ChatList from './chat-list';
import Conversation from './conversation';
import { messagingService } from '@/lib/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';

interface MessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialChatId?: string;
  initialOtherUser?: { id: string, name: string, role: string };
}

export default function MessagingModal({ 
  isOpen, 
  onClose, 
  initialChatId,
  initialOtherUser 
}: MessagingModalProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(initialChatId);
  const [selectedOtherUser, setSelectedOtherUser] = useState<{ id: string, name: string, role: string } | undefined>(initialOtherUser);
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const { user } = useAuth();

  const handleSelectChat = (chatId: string, otherUser: { id: string, name: string, role: string }) => {
    setSelectedChatId(chatId);
    setSelectedOtherUser(otherUser);
    setShowMobileConversation(true);
  };

  const handleBackToList = () => {
    setShowMobileConversation(false);
    setSelectedChatId(undefined);
    setSelectedOtherUser(undefined);
  };

  const handleCreateChat = async (otherUserId: string, otherUserName: string, otherUserRole: string) => {
    if (!user) return;
    
    try {
      const chatId = await messagingService.getOrCreateChat(
        user.id,
        otherUserId,
        user.displayName || user.email,
        otherUserName,
        user.currentRole || 'client',
        otherUserRole
      );
      
      handleSelectChat(chatId, { id: otherUserId, name: otherUserName, role: otherUserRole });
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] h-[600px] p-0" data-testid="messaging-modal">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Messages</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-modal">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex h-full">
          {/* Mobile: Show either chat list or conversation */}
          <div className="flex-1 md:hidden">
            {showMobileConversation && selectedChatId && selectedOtherUser ? (
              <Conversation 
                chatId={selectedChatId}
                otherUser={selectedOtherUser}
                onBack={handleBackToList}
              />
            ) : (
              <ChatList 
                onSelectChat={handleSelectChat}
                selectedChatId={selectedChatId}
              />
            )}
          </div>
          
          {/* Desktop: Show both side by side */}
          <div className="hidden md:flex w-full">
            <div className="w-1/3 border-r">
              <ChatList 
                onSelectChat={handleSelectChat}
                selectedChatId={selectedChatId}
              />
            </div>
            <div className="flex-1">
              {selectedChatId && selectedOtherUser ? (
                <Conversation 
                  chatId={selectedChatId}
                  otherUser={selectedOtherUser}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="text-select-conversation">
                  <div className="text-center">
                    <div className="text-lg mb-2">Select a conversation</div>
                    <div className="text-sm">Choose a chat from the list to start messaging</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}