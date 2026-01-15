/**
 * Socket.io Context Provider
 * 
 * Manages Socket.io connection and provides real-time messaging functionality
 */

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
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

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  onMessage: (callback: (message: Message) => void) => () => void;
  onError: (callback: (error: { message: string }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageCallbacksRef = useRef<Set<(message: Message) => void>>(new Set());
  const errorCallbacksRef = useRef<Set<(error: { message: string }) => void>>(new Set());
  const errorLogThrottleRef = useRef<{ lastError: number; count: number }>({ lastError: 0, count: 0 });

  useEffect(() => {
    if (!user || !token) {
      // Disconnect if user logs out
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // E2E testing only: disable real-time socket connections to avoid noisy auth failures
    // and "networkidle" hangs in automated tests.
    //
    // IMPORTANT: Keep Socket.io ENABLED for production so real-time updates work for live users.
    const isE2E =
      import.meta.env.VITE_E2E === '1' ||
      (typeof window !== 'undefined' &&
        window.location.hostname === 'localhost' &&
        window.localStorage.getItem('E2E_MODE') === 'true');

    if (isE2E) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setIsConnected(false);
      return;
    }

    // Get API URL for socket connection.
    // - In local dev (Vite frontend on :3000), Socket.io connects directly to API backend on :5000
    //   because Vite's proxy only handles /api and /graphql paths, not WebSocket connections.
    // - In production on hospogo.com (single origin), use the current origin or VITE_API_URL.
    // NOTE: We intentionally ignore VITE_API_URL in local dev to prevent connecting to production.
    const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const apiUrl = isLocalDev
      ? 'http://localhost:5000'
      : (import.meta.env.VITE_API_URL || window.location.origin);
    
    // Initialize socket connection
    const newSocket = io(apiUrl, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      logger.debug('SOCKET', 'Connected to server');
      setIsConnected(true);
      // Reset error throttle on successful connection
      errorLogThrottleRef.current = { lastError: 0, count: 0 };
    });

    newSocket.on('disconnect', () => {
      logger.debug('SOCKET', 'Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      // Throttle error logging to reduce console noise
      const now = Date.now();
      const throttle = errorLogThrottleRef.current;
      
      // Only log first error, then every 10 seconds if errors persist
      if (throttle.lastError === 0 || now - throttle.lastError > 10000) {
        logger.error('SOCKET', 'Connection error:', error);
        throttle.lastError = now;
        throttle.count = 1;
      } else {
        throttle.count++;
      }
      setIsConnected(false);
    });

    newSocket.on('joined_room', (data: { conversationId: string }) => {
      logger.debug('SOCKET', 'Joined room:', data.conversationId);
    });

    newSocket.on('new_message', (message: Message) => {
      logger.debug('SOCKET', 'New message received:', message);
      // Notify all registered callbacks
      messageCallbacksRef.current.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          logger.error('SOCKET', 'Error in message callback:', error);
        }
      });
    });

    newSocket.on('error', (error: { message: string }) => {
      // Throttle error logging to reduce console noise
      const now = Date.now();
      const throttle = errorLogThrottleRef.current;
      
      // Only log first error, then every 10 seconds if errors persist
      if (throttle.lastError === 0 || now - throttle.lastError > 10000) {
        logger.error('SOCKET', 'Socket error:', error);
        throttle.lastError = now;
        throttle.count = 1;
      } else {
        throttle.count++;
      }
      
      // Notify all registered error callbacks
      errorCallbacksRef.current.forEach((callback) => {
        try {
          callback(error);
        } catch (err) {
          // Suppress callback errors to prevent error loops
          if (throttle.lastError === 0 || now - throttle.lastError > 10000) {
            logger.error('SOCKET', 'Error in error callback:', err);
          }
        }
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const joinConversation = useCallback((conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('join_room', { conversationId });
    }
  }, [socket, isConnected]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_room', { conversationId });
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (socket && isConnected) {
      socket.emit('send_message', { conversationId, content });
    } else {
      logger.error('SOCKET', 'Cannot send message: not connected');
    }
  }, [socket, isConnected]);

  const onMessage = useCallback((callback: (message: Message) => void) => {
    messageCallbacksRef.current.add(callback);
    return () => {
      messageCallbacksRef.current.delete(callback);
    };
  }, []);

  const onError = useCallback((callback: (error: { message: string }) => void) => {
    errorCallbacksRef.current.add(callback);
    return () => {
      errorCallbacksRef.current.delete(callback);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinConversation,
        leaveConversation,
        sendMessage,
        onMessage,
        onError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
