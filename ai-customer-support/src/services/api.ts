import axios, { InternalAxiosRequestConfig } from 'axios';
import { socketService } from './socket';

// Handle API errors globally
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const auth = {
  signup: async (data: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// User API
export const users = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },

  getOnlineAgents: async () => {
    const response = await api.get('/users/agents/online');
    return response.data;
  },

  getAgentMetrics: async () => {
    const response = await api.get('/users/agents/metrics');
    return response.data;
  },
};

// Chat API
export const chats = {
  create: async () => {
    try {
      const response = await api.post('/chat');
      return response.data;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  },

  getMessages: async (chatId: string) => {
    try {
      const response = await api.get(`/chat/${chatId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  },

  sendMessage: async (chatId: string, content: string) => {
    try {
      const response = await api.post(`/chat/${chatId}/messages`, { content });
      // Also send through socket for real-time updates
      socketService.sendMessage(chatId, content);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  getUserChats: async () => {
    try {
      const response = await api.get('/chat');
      return response.data;
    } catch (error) {
      console.error('Error getting user chats:', error);
      throw error;
    }
  },

  setTypingStatus: (chatId: string, isTyping: boolean) => {
    socketService.sendTypingStatus(chatId, isTyping);
  },
};

export default api;