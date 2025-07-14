import api from './api';
import { Ticket } from '@/components/TicketCard';

export const tickets = {
  create: async (data: { title: string; description: string; priority: 'low' | 'medium' | 'high' }) => {
    try {
      const response = await api.post('/tickets', data);
      return response.data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  },

  getAll: async () => {
    try {
      const response = await api.get('/tickets');
      return response.data;
    } catch (error) {
      console.error('Error getting tickets:', error);
      throw error;
    }
  },
  getCustomerTickets: async () => {
    try {
      const response = await api.get('/tickets/my-tickets');
      return response.data;
    } catch (error) {
      console.error('Error getting tickets:', error);
      throw error;
    }
  },

  getById: async (ticketId: string) => {
    try {
      const response = await api.get(`/tickets/${ticketId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw error;
    }
  },

  update: async (ticketId: string, data: Partial<Ticket>) => {
    try {
      const response = await api.patch(`/tickets/${ticketId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  },

  assign: async (ticketId: string, agentId: string) => {
    try {
      const response = await api.post(`/tickets/${ticketId}/assign`, { agentId });
      return response.data;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  },

  escalate: async (ticketId: string, reason: string) => {
    try {
      const response = await api.post(`/tickets/${ticketId}/escalate`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error escalating ticket:', error);
      throw error;
    }
  },

  assignAgent: async (ticketId: string, agentId: string) => {
    try {
      const response = await api.post(`/tickets/${ticketId}/assign`, {
        agentId,
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning agent to ticket:', error);
      throw error;
    }
  },

  getAssigned: async () => {
    try {
      const response = await api.get('/tickets/assigned');
      return response.data;
    } catch (error) {
      console.error('Error getting assigned tickets:', error);
      throw error;
    }
  },

  getAgentNameandEmail: async (ticketId: string) => {
    try{
      const response = await api.get(`/tickets/${ticketId}/agent`);
      return response.data;
    } catch (error) {
      console.error('Error getting assigned tickets:', error);
      throw error;
    }
  }

};