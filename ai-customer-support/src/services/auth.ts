import api  from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'agent' | 'supervisor';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  role: 'customer' | 'agent' | 'supervisor';
}

export interface LoginData {
  email: string;
  password: string;
}

import { toastService } from './toast';

export const authService = {
  async signup(data: SignupData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/signup', data);
      toastService.success('Successfully signed up!');
      return response.data;
    } catch (error) {
      toastService.error('Failed to sign up. Please try again.');
      throw error;
    }
  },

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', data);
      toastService.success('Successfully logged in!');
      return response.data;
    } catch (error) {
      toastService.error('Invalid credentials. Please try again.');
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
      toastService.success('Successfully logged out!');
    } catch (error) {
      toastService.error('Failed to logout. Please try again.');
      throw error;
    }
  },

  async getProfile(): Promise<User> {
    try {
      const response = await api.get<User>('/users/profile');
      return response.data;
    } catch (error) {
      toastService.error('Failed to fetch profile. Please try again.');
      throw error;
    }
  },

  setToken(token: string): void {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  removeToken(): void {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};