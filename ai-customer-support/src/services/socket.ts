import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: any) => void)[] = [];
  private typingHandlers: ((data: { chatId: string; userId: string; isTyping: boolean }) => void)[] = [];
  private onlineStatusHandlers: ((data: { userId: string; isOnline: boolean }) => void)[] = [];

  connect(token: string) {
    if (this.socket?.connected){
      console.log('[SocketService] already connected');
      return true;
    };
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] connected! id=', this.socket?.id);
    });

    this.socket.on('new_message', (data) => {
      console.log('[SocketService] got new_message:', data);
      const message = data.message || data;
      this.messageHandlers.forEach((handler) => handler(message));
    });

    this.socket.on('error', (error) => {
      console.error('Message error:', error);
    });

    this.socket.on('typing', (data) => {
      this.typingHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('userStatus', (data) => {
      this.onlineStatusHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(chatId: string) {
    if (!this.socket?.connected) {
      console.warn('[SocketService] Cannot join room, socket not connected:', chatId);
      return false;
    }
    console.log('[SocketService] Joining room:', chatId);
    this.socket.emit('join_chat', chatId);
    return true;
  }
  leaveRoom(chatId: string) {
    this.socket?.emit('leave_chat', chatId);
  }

  sendMessage(chatId: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      this.socket.emit('message', { chatId, content }, (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  sendTypingStatus(chatId: string, isTyping: boolean) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing', { chatId, isTyping });
  }

  onMessage(handler: (message: any) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  offMessage(handler: (message: any) => void) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  onTyping(handler: (data: { chatId: string; userId: string; isTyping: boolean }) => void) {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter(h => h !== handler);
    };
  }

  offTyping(handler: (data: { chatId: string; userId: string; isTyping: boolean }) => void) {
    this.typingHandlers = this.typingHandlers.filter(h => h !== handler);
  }

  onUserStatus(handler: (data: { userId: string; isOnline: boolean }) => void) {
    this.onlineStatusHandlers.push(handler);
    return () => {
      this.onlineStatusHandlers = this.onlineStatusHandlers.filter(h => h !== handler);
    };
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

}

export const socketService = new SocketService();