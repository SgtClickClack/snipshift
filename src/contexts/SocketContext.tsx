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

    // Get API URL from environment or use a safe default.
    // - In production on hospogo.com (single origin), default to the current origin.
    // - In local dev (Vite frontend on :3000), Socket.io connects directly to API backend on :5000
    //   because Vite's proxy only handles /api and /graphql paths, not WebSocket connections.
    const defaultApiUrl =
      typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? window.location.origin
        : 'http://localhost:5000';
    const apiUrl = import.meta.env.VITE_API_URL || defaultApiUrl;
    
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
    });

    newSocket.on('disconnect', () => {
      logger.debug('SOCKET', 'Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      logger.error('SOCKET', 'Connection error:', error);
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
      logger.error('SOCKET', 'Socket error:', error);
      // Notify all registered error callbacks
      errorCallbacksRef.current.forEach((callback) => {
        try {
          callback(error);
        } catch (err) {
          logger.error('SOCKET', 'Error in error callback:', err);
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
