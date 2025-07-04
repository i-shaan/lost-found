// 'use client';

// import React from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Bell, X, Check, Eye, MessageSquare, Award, MapPin, Calendar, Mail, Phone } from 'lucide-react';
// import { useSocket } from '@/contexts/SocketContext';
// import { format } from 'date-fns';
// import toast from 'react-hot-toast';
// import Link from 'next/link';

// interface NotificationCenterProps {
//   isOpen: boolean;
//   onClose: () => void;
// }

// const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
//   const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useSocket();

//   const getNotificationIcon = (type: string) => {
//     switch (type) {
//       case 'new_match':
//         return <Bell className="w-5 h-5 text-blue-600" />;
//       case 'item_resolved':
//         return <Check className="w-5 h-5 text-green-600" />;
//       case 'message':
//         return <MessageSquare className="w-5 h-5 text-purple-600" />;
//       default:
//         return <Bell className="w-5 h-5 text-gray-600" />;
//     }
//   };

//   const handleMarkAllAsRead = () => {
//     markAllAsRead();
//     toast.success('All notifications marked as read');
//   };

//   return (
//     <AnimatePresence>
//       {isOpen && (
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           exit={{ opacity: 0 }}
//           className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-16"
//           onClick={onClose}
//         >
//           <motion.div
//             initial={{ y: -20, opacity: 0 }}
//             animate={{ y: 0, opacity: 1 }}
//             exit={{ y: -20, opacity: 0 }}
//             className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden"
//             onClick={(e) => e.stopPropagation()}
//           >
//             {/* Header */}
//             <div className="p-6 border-b border-gray-200">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
//                   {unreadCount > 0 && (
//                     <p className="text-sm text-gray-600">{unreadCount} unread</p>
//                   )}
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   {unreadCount > 0 && (
//                     <button
//                       onClick={handleMarkAllAsRead}
//                       className="text-sm text-primary-600 hover:text-primary-700 font-medium"
//                     >
//                       Mark all read
//                     </button>
//                   )}
//                   <button
//                     onClick={onClose}
//                     className="text-gray-400 hover:text-gray-600"
//                   >
//                     <X className="w-6 h-6" />
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* Notifications List */}
//             <div className="max-h-96 overflow-y-auto">
//               {notifications.length === 0 ? (
//                 <div className="p-8 text-center">
//                   <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
//                   <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
//                   <p className="text-gray-600">You're all caught up!</p>
//                 </div>
//               ) : (
//                 <div className="divide-y divide-gray-200">
//                   {notifications.map((notification) => (
//                     <motion.div
//                       key={notification.id}
//                       initial={{ opacity: 0, x: -20 }}
//                       animate={{ opacity: 1, x: 0 }}
//                       className={`p-4 hover:bg-gray-50 transition-colors ${
//                         !notification.read ? 'bg-blue-50' : ''
//                       }`}
//                     >
//                       <div className="flex gap-3">
//                         <div className="flex-shrink-0 mt-1">
//                           {getNotificationIcon(notification.type)}
//                         </div>
//                         <div className="flex-1 min-w-0">
//                           <div className="flex items-start justify-between">
//                             <div className="flex-1">
//                               <h4 className={`text-sm font-medium ${
//                                 !notification.read ? 'text-gray-900' : 'text-gray-700'
//                               }`}>
//                                 {notification.title}
//                               </h4>
//                               <p className="text-sm text-gray-600 mt-1">
//                                 {notification.message}
//                               </p>
                              
//                               {/* Match Details */}
//                               {notification.type === 'new_match' && notification.data && (
//                                 <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
//                                   <div className="flex items-center justify-between mb-2">
//                                     <h5 className="text-sm font-medium text-gray-900">
//                                       {notification.data.matchedItem?.title}
//                                     </h5>
//                                     <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
//                                       {Math.round((notification.data.confidence || 0) * 100)}% match
//                                     </span>
//                                   </div>
//                                   <div className="flex items-center text-xs text-gray-500 space-x-3 mb-2">
//                                     <div className="flex items-center">
//                                       <MapPin className="w-3 h-3 mr-1" />
//                                       <span>{notification.data.matchedItem?.location}</span>
//                                     </div>
//                                   </div>
                                  
//                                   {/* Match Reasons */}
//                                   {notification.data.reasons && (
//                                     <div className="flex flex-wrap gap-1 mb-2">
//                                       {notification.data.reasons.slice(0, 3).map((reason: string, idx: number) => (
//                                         <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
//                                           {reason}
//                                         </span>
//                                       ))}
//                                     </div>
//                                   )}

//                                   {/* Action Buttons */}
//                                   <div className="flex space-x-2 mt-3">
//                                     <Link
//                                       href={`/items/${notification.data.sourceItem?._id}/matches`}
//                                       className="text-xs bg-primary-600 text-white px-3 py-1 rounded-lg hover:bg-primary-700 transition-colors"
//                                       onClick={onClose}
//                                     >
//                                       View All Matches
//                                     </Link>
//                                     <Link
//                                       href={`/items/${notification.data.matchedItem?._id}`}
//                                       className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
//                                       onClick={onClose}
//                                     >
//                                       View Item
//                                     </Link>
//                                   </div>
//                                 </div>
//                               )}
                              
//                               <p className="text-xs text-gray-500 mt-2">
//                                 {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
//                               </p>
//                             </div>
//                             <div className="flex items-center space-x-1 ml-2">
//                               {!notification.read && (
//                                 <button
//                                   onClick={() => markAsRead(notification.id)}
//                                   className="text-blue-600 hover:text-blue-700 p-1"
//                                   title="Mark as read"
//                                 >
//                                   <Eye className="w-4 h-4" />
//                                 </button>
//                               )}
//                               <button
//                                 onClick={() => removeNotification(notification.id)}
//                                 className="text-gray-400 hover:text-red-600 p-1"
//                                 title="Delete"
//                               >
//                                 <X className="w-4 h-4" />
//                               </button>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     </motion.div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </motion.div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// };

// export default NotificationCenter;
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Eye, MessageSquare, Award, MapPin, Calendar, Mail, Phone, Loader2, RefreshCw, LucideToggleRight, CheckCircle } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { notificationsAPI } from '@/lib/api';
import { HeartHandshake as Handshake } from 'lucide-react';

interface Notification {
  _id: string;
  id?: string; // For backward compatibility
  userId: string;
  type: 'new_match' | 'item_resolved' | 'message' | 'system'| 'resolution_request' | 'resolution_confirmed';
  title: string;
  message: string;
  data?: {
    sourceItem?: any;
    matchedItem?: any;
    confidence?: number;
    reasons?: string[];
    item?: any;
    resolutionId?: string;
    confirmationCode?: string;
    resolution?: string;
    [key: string]: any;
  };
  read: boolean;
  readAt?: Date;
  createdAt: string | Date;
  timeAgo?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { socket } = useSocket();

  const fetchNotifications = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      
      const result = await notificationsAPI.getNotifications(pageNum, 20);
      console.log("response", result);
      
      if (result.success) {
        const newNotifications = result.data.notifications || [];
        
        if (reset || pageNum === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setUnreadCount(result.data.pagination.unreadCount || 0);
        setHasMore(result.data.pagination.hasMore || false);
        setPage(pageNum);
      } else {
        throw new Error(result.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await notificationsAPI.getUnreadCount();
      if (result.success) {
        setUnreadCount(result.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const result = await notificationsAPI.markAsRead(notificationId);
      
      if (result.success) {
        setNotifications(prev => 
          prev.map(n => 
            (n._id === notificationId || n.id === notificationId) 
              ? { ...n, read: true, readAt: new Date() }
              : n
          )
        );
        setUnreadCount(result.data?.unreadCount || Math.max(0, unreadCount - 1));
        toast.success('Marked as read');
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const result = await notificationsAPI.markAllAsRead();
      
      if (result.success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true, readAt: new Date() }))
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const removeNotification = async (notificationId: string) => {
    try {
      const result = await notificationsAPI.deleteNotification(notificationId);
      
      if (result.success) {
        const removedNotification = notifications.find(n => 
          n._id === notificationId || n.id === notificationId
        );
        
        setNotifications(prev => 
          prev.filter(n => n._id !== notificationId && n.id !== notificationId)
        );
        
        if (removedNotification && !removedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1);
    }
  };

  const refresh = () => {
    setRefreshing(true);
    fetchNotifications(1, true);
  };

  // Load notifications when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1, true);
    }
  }, [isOpen, fetchNotifications]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      toast.success('New notification received');
    };

    const handleUnreadCountUpdate = (count: number) => {
      setUnreadCount(count);
    };

    socket.on('notification', handleNewNotification);
    socket.on('unread_count_update', handleUnreadCountUpdate);

    return () => {
      socket.off('notification', handleNewNotification);
      socket.off('unread_count_update', handleUnreadCountUpdate);
    };
  }, [socket]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_match':
        return <Bell className="w-5 h-5 text-blue-600" />;
      case 'item_resolved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'resolution_request':
        return <Handshake className="w-5 h-5 text-orange-600" />;
      case 'resolution_confirmed':
        return <Award className="w-5 h-5 text-purple-600" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_match':
        return 'border-l-blue-500';
      case 'item_resolved':
        return 'border-l-green-500';
      case 'resolution_request':
        return 'border-l-orange-500';
      case 'resolution_confirmed':
        return 'border-l-purple-500';
      case 'message':
        return 'border-l-purple-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getNotificationId = (notification: Notification) => {
    return notification._id || notification.id || '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-16"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                  {unreadCount > 0 && (
                    <p className="text-sm text-gray-600">{unreadCount} unread</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-600">You're all caught up!</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {notifications.map((notification) => (
                      <motion.div
                        key={getNotificationId(notification)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${getNotificationColor(notification.type)} ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className={`text-sm font-medium ${
                                  !notification.read ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                
                                {/* Enhanced notification content based on type */}
                                {notification.type === 'new_match' && notification.data && (
                                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-sm font-medium text-gray-900">
                                        {notification.data.matchedItem?.title}
                                      </h5>
                                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                        {Math.round((notification.data.confidence || 0) * 100)}% match
                                      </span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500 space-x-3 mb-2">
                                      <div className="flex items-center">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        <span>{notification.data.matchedItem?.location}</span>
                                      </div>
                                    </div>
                                    
                                    {/* Match Reasons */}
                                    {notification.data.reasons && (
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {notification.data.reasons.slice(0, 3).map((reason: string, idx: number) => (
                                          <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                            {reason}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex space-x-2 mt-3">
                                      <Link
                                        href={`/items/${notification.data.sourceItem?._id}/matches`}
                                        className="text-xs bg-primary-600 text-white px-3 py-1 rounded-lg hover:bg-primary-700 transition-colors"
                                        onClick={onClose}
                                      >
                                        View All Matches
                                      </Link>
                                      <Link
                                        href={`/items/${notification.data.matchedItem?._id}`}
                                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                                        onClick={onClose}
                                      >
                                        View Item
                                      </Link>
                                    </div>
                                  </div>
                                )}

                                {/* Resolution request notification */}
                                {notification.type === 'resolution_request' && notification.data && (
                                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <p className="text-sm text-orange-800 mb-2">
                                      Someone wants to resolve their item with yours
                                    </p>
                                    {notification.data.confirmationCode && (
                                      <div className="mb-2">
                                        <p className="text-xs text-orange-700 mb-1">Confirmation Code:</p>
                                        <code className="bg-orange-100 text-orange-900 px-2 py-1 rounded text-sm font-mono">
                                          {notification.data.confirmationCode}
                                        </code>
                                      </div>
                                    )}
                                    <div className="flex space-x-2">
                                      <Link
                                        href={`/items/${notification.data.item?._id}/resolution`}
                                        className="text-xs bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 transition-colors"
                                        onClick={onClose}
                                      >
                                        Review Request
                                      </Link>
                                    </div>
                                  </div>
                                )}

                                {/* Resolution confirmed notification */}
                                {notification.type === 'resolution_confirmed' && notification.data && (
                                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-sm text-green-800 mb-2">
                                      🎉 Your item has been successfully resolved!
                                    </p>
                                    {notification.data.resolution && (
                                      <p className="text-xs text-green-700 mb-2">
                                        "{notification.data.resolution}"
                                      </p>
                                    )}
                                    <Link
                                      href={`/items/${notification.data.item?._id}`}
                                      className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors"
                                      onClick={onClose}
                                    >
                                      View Item
                                    </Link>
                                  </div>
                                )}

                                {/* Item resolved notification */}
                                {notification.type === 'item_resolved' && notification.data && (
                                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-sm text-green-800 mb-2">
                                      ✅ Item successfully resolved!
                                    </p>
                                    <Link
                                      href={`/items/${notification.data.item?._id}`}
                                      className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors"
                                      onClick={onClose}
                                    >
                                      View Item
                                    </Link>
                                  </div>
                                )}
                                
                                <p className="text-xs text-gray-500 mt-2">
                                  {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                {!notification.read && (
                                  <button
                                    onClick={() => markAsRead(getNotificationId(notification))}
                                    className="text-blue-600 hover:text-blue-700 p-1"
                                    title="Mark as read"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => removeNotification(getNotificationId(notification))}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                  title="Delete"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {hasMore && (
                    <div className="p-4 border-t border-gray-200">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium py-2 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load more notifications'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;