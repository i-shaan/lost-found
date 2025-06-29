import axios from 'axios';
import Cookies from 'js-cookie';
import { LoginData, RegisterData, User, Item, ItemFilters } from '@/types';

const API_BASE_URL ='http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',

  },
  withCredentials:true
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
    console.log("r",response)
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
    console.log("ress",response)
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

  getMatches: async (id: string) => {
    const response = await api.get(`/items/${id}/matches`);
    return response.data;
  }
};

export default api;