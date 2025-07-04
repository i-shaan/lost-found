import axios from 'axios';
import Cookies from 'js-cookie';
import { LoginData, RegisterData, User, Item, ItemFilters } from '@/types';

const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

const api2 = axios.create({
  baseURL: API_BASE_URL,
  // Remove this line - let axios set it automatically
  // headers: {
  //   'Content-Type': 'multipart/form-data',
  // },
  withCredentials: true
});

// Add auth token to api2 requests as well
api2.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Notification interface
interface Notification {
  _id: string;
  id?: string;
  userId: string;
  type: 'new_match' | 'item_resolved' | 'message' | 'system';
  title: string;
  message: string;
  data?: {
    sourceItem?: any;
    matchedItem?: any;
    confidence?: number;
    reasons?: string[];
    item?: any;
    [key: string]: any;
  };
  read: boolean;
  readAt?: Date;
  createdAt: string | Date;
  timeAgo?: string;
}

// Auth API
export const authAPI = {
  login: async ({ email, password }: { email: string; password: string }) => {
    const res = await axios.post(
      'http://localhost:5001/api/users/login',
      { email, password },
      { withCredentials: true } // ✅ include cookies
    );
    
    return res.data.data;
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/users/register', data);
    return response.data;
  },

  logout: () => {
    Cookies.remove('token');
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/profile',
    { withCredentials: true });
    console.log("r", response)
    return response.data.data;
  },

  updateProfile: async (data: Partial<User>) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/users/stats');
    return response.data;
  }
};

// Items API
export const itemsAPI = {
  getItems: async (filters?: ItemFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/items?${params.toString()}`);
    
    return response.data.data.docs;
  },

  getMyItems: async (): Promise<Item[]> => {
    const response = await api.get('/items/my-items');
    // console.log('rrrr',response.data.data.docs)
    return response.data.data.docs;
  },
  
  getItemById: async (id: string): Promise<Item> => {
    const response = await api.get(`/items/${id}`);
    return response.data;
  },

  createItem: async (data: FormData) => {
    const response = await api2.post('/items', data);
    console.log("ress", response)
    return response.data;
  },

  updateItem: async (id: string, data: Partial<Item>) => {
    const response = await api.put(`/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id: string) => {
    const response = await api.delete(`/items/${id}`);
    return response.data;
  },

  getMatches: async (id: string, params?: { threshold?: string; limit?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.threshold) queryParams.append('threshold', params.threshold);
    if (params?.limit) queryParams.append('limit', params.limit);
    
    const response = await api.get(`/items/${id}/matches?${queryParams.toString()}`);
    return response.data.data;
  },

  removeMatch: async (itemId: string, matchId: string) => {
    const response = await api.delete(`/items/${itemId}/matches/${matchId}`);
    return response.data;
  },

  refreshMatches: async (id: string) => {
    const response = await api.post(`/items/${id}/refresh-matches`);
    return response.data;
  },
    // Resolution API
    resolveItem: async (itemId: string, data: {
      matchedItemId: string;
      resolution: string;
      confirmationCode?: string;
    }) => {
      const response = await api.post(`/items/${itemId}/resolve`, data);
      return response.data;
    },
  
    confirmResolution: async (itemId: string, confirmationCode: string) => {
      const response = await api.post(`/items/${itemId}/confirm-resolution`, {
        confirmationCode
      });
      return response.data;
    },
  
    getResolutionStatus: async (itemId: string) => {
      const response = await api.get(`/items/${itemId}/resolution-status`);
      return response.data;
    }
};

// Notifications API
export const notificationsAPI = {
  getNotifications: async (page = 1, limit = 20) => {
    const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },

  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  }
};

export default api;