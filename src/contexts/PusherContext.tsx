/**
 * Pusher Context Provider
 * 
 * Manages Pusher connection and provides real-time messaging functionality
 */

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import Pusher from 'pusher-js';
import type { Channel } from 'pusher-js';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { logger } from '@/lib/logger';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
}

interface ShiftStatusUpdate {
  shiftId: string;
  shiftTitle: string;
  status: string;
  changes: Record<string, any>;
  timestamp: string;
}

interface ShiftInvite {
  shiftId: string;
  shiftTitle: string;
  venueName: string;
  venueId: string;
}

interface PusherContextType {
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  onMessage: (callback: (message: Message) => void) => () => void;
  onShiftStatusUpdate: (callback: (update: ShiftStatusUpdate) => void) => () => void;
  onShiftInvite: (callback: (invite: ShiftInvite) => void) => () => void;
  onError: (callback: (error: { message: string }) => void) => () => void;
}

const PusherContext = createContext<PusherContextType | undefined>(undefined);

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const pusherRef = useRef<Pusher | null>(null);
  const userChannelRef = useRef<Channel | null>(null);
  const channelsRef = useRef<Map<string, Channel>>(new Map());
  const messageCallbacksRef = useRef<Set<(message: Message) => void>>(new Set());
  const shiftStatusCallbacksRef = useRef<Set<(update: ShiftStatusUpdate) => void>>(new Set());
  const shiftInviteCallbacksRef = useRef<Set<(invite: ShiftInvite) => void>>(new Set());
  const errorCallbacksRef = useRef<Set<(error: { message: string }) => void>>(new Set());
  const lastShiftUpdateTsRef = useRef<Map<string, number>>(new Map());
  const lastReconnectRefetchAtRef = useRef<number>(0);
  const invalidateQueriesThrottleRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!user || !token) {
      // Disconnect if user logs out
      if (pusherRef.current) {
        // Clean up user channel if it exists
        if (userChannelRef.current) {
          userChannelRef.current.unbind_all();
          pusherRef.current.unsubscribe(`private-user-${user?.id || ''}`);
          userChannelRef.current = null;
        }
        pusherRef.current.disconnect();
        pusherRef.current = null;
        channelsRef.current.clear();
        setIsConnected(false);
      }
      return;
    }

    // E2E testing only: disable real-time connections to avoid noisy auth failures
    const isE2E =
      import.meta.env.VITE_E2E === '1' ||
      (typeof window !== 'undefined' &&
        window.location.hostname === 'localhost' &&
        window.localStorage.getItem('E2E_MODE') === 'true');

    if (isE2E) {
      if (pusherRef.current) {
        // Clean up user channel if it exists
        if (userChannelRef.current) {
          userChannelRef.current.unbind_all();
          pusherRef.current.unsubscribe(`private-user-${user?.id || ''}`);
          userChannelRef.current = null;
        }
        pusherRef.current.disconnect();
        pusherRef.current = null;
        channelsRef.current.clear();
      }
      setIsConnected(false);
      return;
    }

    const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || 'us2';

    if (!pusherKey) {
      logger.warn('PUSHER', 'Pusher key not configured. Real-time features disabled.');
      setIsConnected(false);
      return;
    }

    // Initialize Pusher connection
    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      enabledTransports: ['ws', 'wss'],
    });

    pusher.connection.bind('connected', () => {
      logger.debug('PUSHER', 'Connected to Pusher');
      setIsConnected(true);
      
      // SECURITY AUDIT: Refetch active shift data when connection is restored
      // This ensures users see up-to-date information after reconnection
      // Throttle reconnect refetch to avoid stampedes (especially on spotty mobile networks).
      const now = Date.now();
      if (now - lastReconnectRefetchAtRef.current < 10_000) return;
      lastReconnectRefetchAtRef.current = now;

      try {
        queryClient.refetchQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            if (!Array.isArray(queryKey)) return false;
            return queryKey.some(
              (key) =>
                typeof key === 'string' &&
                (key.includes('shift') || key.includes('shifts') || key.includes('active-shifts'))
            );
          },
        });
        logger.debug('PUSHER', 'Refetched shift-related queries after reconnection');
      } catch (error) {
        logger.error('PUSHER', 'Error refetching queries after reconnection:', error);
      }
    });

    pusher.connection.bind('disconnected', () => {
      logger.debug('PUSHER', 'Disconnected from Pusher');
      setIsConnected(false);
    });

    pusher.connection.bind('error', (error: any) => {
      logger.error('PUSHER', 'Connection error:', error);
      setIsConnected(false);
      errorCallbacksRef.current.forEach((callback) => {
        try {
          callback({ message: error?.message || 'Pusher connection error' });
        } catch (err) {
          logger.error('PUSHER', 'Error in error callback:', err);
        }
      });
    });

    // Subscribe to user's private channel for notifications
    // Guard: Ensure user.id exists before subscribing to prevent "user-undefined" channel
    if (!user?.id) {
      logger.warn('PUSHER', 'Cannot subscribe to user channel: user.id is undefined');
      setIsConnected(false);
      return;
    }
    
    const userChannel = pusher.subscribe(`private-user-${user.id}`);
    userChannelRef.current = userChannel;
    
    userChannel.bind('pusher:subscription_succeeded', () => {
      logger.debug('PUSHER', `Subscribed to user channel: user-${user.id}`);
    });

    // Listen for shift status updates
    // ELITE AUDIT SPRINT PART 5 - TASK 2: Real-Time State Reconciliation
    // Implement version/last_updated check to force stale-while-revalidate refresh
    userChannel.bind('SHIFT_STATUS_UPDATE', (data: ShiftStatusUpdate) => {
      logger.debug('PUSHER', 'Shift status update received:', data);
      
      // Drop stale/out-of-order events (best-effort).
      const eventTs = data?.timestamp ? Date.parse(data.timestamp) : NaN;
      const nextTs = Number.isFinite(eventTs) ? eventTs : Date.now();
      const lastTs = lastShiftUpdateTsRef.current.get(data.shiftId) ?? 0;
      if (nextTs <= lastTs) return;
      lastShiftUpdateTsRef.current.set(data.shiftId, nextTs);

      // PERFORMANCE: Throttle invalidateQueries calls to prevent excessive refetches
      // This prevents page reloads when multiple Pusher events arrive in quick succession
      const now = Date.now();
      const lastInvalidateTime = invalidateQueriesThrottleRef.current.get(data.shiftId) ?? 0;
      const THROTTLE_MS = 500; // 500ms throttle window
      
      if (now - lastInvalidateTime < THROTTLE_MS) {
        logger.debug('PUSHER', `Throttled invalidateQueries for shift ${data.shiftId} (last invalidate: ${now - lastInvalidateTime}ms ago)`);
        // Still call callbacks immediately, but defer query invalidation
        shiftStatusCallbacksRef.current.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            logger.error('PUSHER', 'Error in shift status update callback:', error);
          }
        });
        return;
      }
      
      invalidateQueriesThrottleRef.current.set(data.shiftId, now);

      try {
        queryClient.invalidateQueries({ queryKey: ['shift', data.shiftId] });
        logger.debug('PUSHER', `Invalidated shift query for shift ${data.shiftId} due to status update`);
      } catch (error) {
        logger.error('PUSHER', 'Error invalidating shift query after status update:', error);
      }
      
      shiftStatusCallbacksRef.current.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error('PUSHER', 'Error in shift status update callback:', error);
        }
      });
    });

    // Listen for shift invites
    userChannel.bind('SHIFT_INVITE', (data: ShiftInvite) => {
      logger.debug('PUSHER', 'Shift invite received:', data);
      shiftInviteCallbacksRef.current.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error('PUSHER', 'Error in shift invite callback:', error);
        }
      });
    });

    pusherRef.current = pusher;

    return () => {
      // Clean up user channel: unbind all event listeners and unsubscribe
      if (userChannelRef.current && user?.id) {
        userChannelRef.current.unbind_all();
        const channelName = `private-user-${user.id}`;
        if (pusherRef.current) {
          pusherRef.current.unsubscribe(channelName);
        }
        userChannelRef.current = null;
      }
      
      // Disconnect Pusher connection
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
      
      // Clear conversation channels
      channelsRef.current.clear();
      lastShiftUpdateTsRef.current.clear();
      invalidateQueriesThrottleRef.current.clear();
      setIsConnected(false);
    };
   
  }, [user, token, queryClient]);

  const joinConversation = useCallback((conversationId: string) => {
    if (!pusherRef.current || !isConnected) {
      logger.warn('PUSHER', 'Cannot join conversation: not connected');
      return;
    }

    const channelName = `private-conversation-${conversationId}`;
    
    // Check if already subscribed
    if (channelsRef.current.has(channelName)) {
      logger.debug('PUSHER', `Already subscribed to conversation: ${conversationId}`);
      return;
    }

    const channel = pusherRef.current.subscribe(channelName);
    
    channel.bind('pusher:subscription_succeeded', () => {
      logger.debug('PUSHER', `Subscribed to conversation: ${conversationId}`);
    });

    channel.bind('new_message', (message: Message) => {
      logger.debug('PUSHER', 'New message received:', message);
      messageCallbacksRef.current.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          logger.error('PUSHER', 'Error in message callback:', error);
        }
      });
    });

    channelsRef.current.set(channelName, channel);
  }, [isConnected]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (!pusherRef.current) {
      return;
    }

    const channelName = `private-conversation-${conversationId}`;
    const channel = channelsRef.current.get(channelName);
    
    if (channel) {
      pusherRef.current.unsubscribe(channelName);
      channelsRef.current.delete(channelName);
      logger.debug('PUSHER', `Unsubscribed from conversation: ${conversationId}`);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!isConnected) {
      logger.error('PUSHER', 'Cannot send message: not connected');
      return;
    }

    // Send message via API (Pusher events are triggered server-side)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error: any) {
      logger.error('PUSHER', 'Error sending message:', error);
      errorCallbacksRef.current.forEach((callback) => {
        try {
          callback({ message: error?.message || 'Failed to send message' });
        } catch (err) {
          logger.error('PUSHER', 'Error in error callback:', err);
        }
      });
    }
  }, [isConnected, token]);

  const onMessage = useCallback((callback: (message: Message) => void) => {
    messageCallbacksRef.current.add(callback);
    return () => {
      messageCallbacksRef.current.delete(callback);
    };
  }, []);

  const onShiftStatusUpdate = useCallback((callback: (update: ShiftStatusUpdate) => void) => {
    shiftStatusCallbacksRef.current.add(callback);
    return () => {
      shiftStatusCallbacksRef.current.delete(callback);
    };
  }, []);

  const onShiftInvite = useCallback((callback: (invite: ShiftInvite) => void) => {
    shiftInviteCallbacksRef.current.add(callback);
    return () => {
      shiftInviteCallbacksRef.current.delete(callback);
    };
  }, []);

  const onError = useCallback((callback: (error: { message: string }) => void) => {
    errorCallbacksRef.current.add(callback);
    return () => {
      errorCallbacksRef.current.delete(callback);
    };
  }, []);

  return (
    <PusherContext.Provider
      value={{
        isConnected,
        joinConversation,
        leaveConversation,
        sendMessage,
        onMessage,
        onShiftStatusUpdate,
        onShiftInvite,
        onError,
      }}
    >
      {children}
    </PusherContext.Provider>
  );
}

export function usePusher() {
  const context = useContext(PusherContext);
  if (context === undefined) {
    throw new Error('usePusher must be used within a PusherProvider');
  }
  return context;
}
