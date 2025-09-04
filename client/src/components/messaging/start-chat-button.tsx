import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { messagingService } from '@/lib/messaging';
import { useAuth } from '@/contexts/AuthContext';
import MessagingModal from './messaging-modal';
import { MessageCircle } from 'lucide-react';

interface StartChatButtonProps {
  otherUserId: string;
  otherUserName: string;
  otherUserRole: string;
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function StartChatButton({
  otherUserId,
  otherUserName,
  otherUserRole,
  className,
  children,
  variant = "outline",
  size = "sm"
}: StartChatButtonProps) {
  const [showMessaging, setShowMessaging] = useState(false);
  const [chatId, setChatId] = useState<string | undefined>();
  const { user } = useAuth();

  const handleStartChat = async () => {
    if (!user) return;
    
    try {
      const newChatId = await messagingService.getOrCreateChat(
        user.id,
        otherUserId,
        user.displayName || user.email,
        otherUserName,
        user.currentRole || 'client',
        otherUserRole
      );
      
      setChatId(newChatId);
      setShowMessaging(true);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  if (!user || user.id === otherUserId) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleStartChat}
        className={className}
        data-testid={`button-start-chat-${otherUserId}`}
      >
        {children || (
          <>
            <MessageCircle className="h-4 w-4 mr-2" />
            Message
          </>
        )}
      </Button>
      
      <MessagingModal
        isOpen={showMessaging}
        onClose={() => setShowMessaging(false)}
        initialChatId={chatId}
        initialOtherUser={chatId ? { id: otherUserId, name: otherUserName, role: otherUserRole } : undefined}
      />
    </>
  );
}