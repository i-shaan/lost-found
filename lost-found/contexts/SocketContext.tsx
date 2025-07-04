'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
}

interface Notification {
  id: string;
  type: 'new_match' | 'item_resolved' | 'message' | 'system'| 'resolution_request' | 'resolution_confirmed';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (user) {
      // Initialize socket connection with better configuration
      const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001', {
        auth: {
          userId: user._id
        },
        withCredentials: true,
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        timeout: 20000,
        forceNew: true
      });

      socketInstance.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        // Join user-specific room
        socketInstance.emit('join', `user_${user._id}`);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
        toast.error('Failed to connect to notification service');
      });

      // Listen for notifications
      socketInstance.on('notification', (notificationData: any) => {
        console.log('Received notification:', notificationData);
        
        const newNotification: Notification = {
          id: Date.now().toString(),
          type: notificationData.type,
          title: getNotificationTitle(notificationData),
          message: getNotificationMessage(notificationData),
          data: notificationData,
          read: false,
          createdAt: new Date()
        };

        setNotifications(prev => [newNotification, ...prev]);
        
        // Show toast notification
        toast.success(newNotification.title, {
          duration: 5000,
          icon: '🎯'
        });
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } else {
      // Cleanup when user logs out
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setNotifications([]);
      }
    }
  }, [user]);

  const getNotificationTitle = (data: any): string => {
    switch (data.type) {
      case 'new_match':
        return `🎯 Potential Match Found!`;
      case 'item_resolved':
        return `✅ Item Resolved!`;
      default:
        return 'New Notification';
    }
  };

  const getNotificationMessage = (data: any): string => {
    switch (data.type) {
      case 'new_match':
        return `We found a potential match for your ${data.sourceItem?.type} item: ${data.sourceItem?.title}`;
      case 'item_resolved':
        return `Your item "${data.item?.title}" has been marked as resolved`;
      default:
        return 'You have a new notification';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};