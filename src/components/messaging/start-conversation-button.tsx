/**
 * Start Conversation Button Component
 * 
 * Creates or opens a conversation with a target user and redirects to messages page
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface StartConversationButtonProps {
  targetUserId: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export function StartConversationButton({
  targetUserId,
  className,
  variant = "outline",
  size = "sm",
  children,
}: StartConversationButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartConversation = async () => {
    if (!user || user.id === targetUserId) {
      return;
    }

    setIsLoading(true);
    try {
      // Create or get existing conversation
      const response = await apiRequest('POST', '/api/conversations', {
        targetUserId: targetUserId,
      });

      const data = await response.json();
      
      // Navigate to messages page with conversation selected
      navigate(`/messages?conversation=${data.id}`);
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start conversation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.id === targetUserId) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStartConversation}
      disabled={isLoading}
      className={className}
    >
      {children || (
        <>
          <MessageCircle className="h-4 w-4 mr-2" />
          Message
        </>
      )}
    </Button>
  );
}
