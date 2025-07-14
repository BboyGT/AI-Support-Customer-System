import { socketService } from './socket';
import api  from './api';

export interface Message {
  id: string;
  content: string;
  // sender: 'user' | 'ai' | 'agent';
  sender: string; // Changed to string to allow any user ID
  messageType:string;
  timestamp: string;
  chatId: string;
}

export interface Chat {
  id: string;
  ticketId: string;
  messages: Message[];
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  status: 'active' | 'closed';
}

class ChatService {
  private activeChats: Map<string, Chat> = new Map();
  private messageHandlers: ((message: Message) => void)[] = [];

  async initializeChat(ticketId: string): Promise<Chat> {
    try {
      const response = await api.post('/chat', { ticketId });
      const chat = response.data;
      this.activeChats.set(chat.id, chat);
      return chat;
    } catch (error) {
      console.error('Error initializing chat:', error);
      throw error;
    }
  }

  async getMessages(chatId: string): Promise<Message[]> {
    try {
      const response = await api.get(`/chat/${chatId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  async sendMessage(chatId: string, content: string): Promise<Message> {
    // Create an optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      sender: 'user',
      messageType: 'text',
      timestamp: new Date().toISOString(),
      chatId
    };

    // Notify subscribers immediately with the optimistic message
    this.messageHandlers.forEach(handler => handler(optimisticMessage));

    return new Promise((resolve, reject) => {
      socketService.sendMessage(chatId, content)
        .then(() => {
          // Final message will come through 'new_message' socket event
          resolve(optimisticMessage); // resolve optimistically
        })
        .catch((err) => {
          console.error('Socket send failed', err);
          reject(err);
        });
    });
  }

  setTypingStatus(chatId: string, isTyping: boolean) {
    socketService.sendTypingStatus(chatId, isTyping);
  }

  async getChatHistory(ticketId: string): Promise<Chat | null> {
    try {
      const response = await api.get(`/chat/ticket/${ticketId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
      return null;
    }
  }

  subscribeToMessages(chatId: string, callback: (message: Message) => void): () => void {
    if (socketService.isConnected()) {
      console.log('[ChatService] Socket connected, joining room:', chatId);
      socketService.joinRoom(chatId);
    } else {
      console.warn('[ChatService] Socket not connected when trying to join room:', chatId);
      const token = localStorage.getItem('token');
      if (token) {
        console.log('[ChatService] Attempting to reconnect socket with token from localStorage');
        socketService.connect(token);
        setTimeout(() => {
          if (socketService.isConnected()) {
            console.log('[ChatService] Socket reconnected, now joining room:', chatId);
            socketService.joinRoom(chatId);
          } else {
            console.error('[ChatService] Failed to reconnect socket');
          }
        }, 1000);
      }
    }

    // 👇 Register the listener
    const handler = (data: { message: Message }) => {
      console.log('[ChatService] Received new_message:', data.message);
      callback(data.message);
    };

    socketService.on('new_message', handler);

    // 👇 Return the unsubscribe function
    return () => {
      console.log('[ChatService] Unsubscribing from new_message');
      socketService.off('new_message', handler);
    };
  }

  subscribeToTypingStatus(chatId: string, callback: (data: { userId: string; isTyping: boolean }) => void): () => void {
    const handler = (data: { chatId: string; userId: string; isTyping: boolean }) => {
      if (data.chatId === chatId) {
        callback(data);
      }
    };
    socketService.onTyping(handler);
    return () => socketService.offTyping(handler);
  }
}

export const chatService = new ChatService();