'use client';

import React, { useState, useEffect, useRef } from 'react';
import { chatService, Message } from '@/services/chat';
import { useAuthStore } from '@/lib/authStore';
import { socketService } from '@/services/socket';
import { authService } from '@/services/auth';
import { flushSync } from 'react-dom';

interface ChatBoxProps {
  ticketId: string;
  chatId?: string;
  initialMessages?: Message[];
  onClose?: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ ticketId, chatId, initialMessages = [], onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const { user, token } = useAuthStore();
  
  useEffect(() => {
    console.log('[ChatBox] token from store:', token);
    console.log('[ChatBox] token from localStorage:', authService.getToken());
  }, [token]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setError('');

        const chat = chatId
          ? { id: chatId }
          : await chatService.getChatHistory(ticketId) || await chatService.initializeChat(ticketId);

        // const currentChatId = chat.id;
        setCurrentChatId(chat.id);
        const chatMessages = await chatService.getMessages(chat.id);

        const allMessages = [
          ...initialMessages,
          ...chatMessages.filter(msg => !initialMessages.some(initial => initial.id === msg.id)),
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setMessages(allMessages);
      } catch (err) {
        setError('Failed to load chat history');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    return () => {
      setMessages([]);
      setNewMessage('');
    };
  }, [ticketId, chatId, initialMessages]);

  useEffect(() => {
    if (!currentChatId) {
      console.log('[ChatBox] cannot subscribe yet, missing chatId');
      return;
    }
    
    // Make sure socket is connected before trying to join room
    if (!socketService.isConnected()) {
      const authToken = token || authService.getToken();
      if (authToken) {
        console.log('[ChatBox] reconnecting socket before subscribing');
        socketService.connect(authToken);
      } else {
        console.log('[ChatBox] cannot subscribe, no token available');
        return;
      }
    }
    
    console.log('[ChatBox] subscribing to messages for chatId:', currentChatId);
    const unsubscribe = chatService.subscribeToMessages(currentChatId, (msg) => {
      if (!msg || typeof msg !== 'object' || !msg.content) {
        console.warn('[ChatBox] Received invalid message:', msg);
        return;
      }
      console.log('[ChatBox] received message in chatbox:', msg);
      // Check if message already exists in the messages array
      flushSync(() => {
        setMessages(prev => {
          // If there's a temp message with same content, replace it
          const tempIndex = prev.findIndex(m => {
            if (!m.id) {
              // console.warn('Message missing ID:', m);
              return false;
            }
            return (
              typeof m.id === 'string' &&
              m.id.startsWith('temp-') &&
              m.content === msg.content &&
              m.sender === msg.sender
            );
          });


          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = msg; // Replace with real one
            return updated;
          }

          // If no duplicate, just add it
          const isDuplicate = msg.id && prev.some(m => m.id === msg.id);

          // You can also avoid adding duplicates by checking content + timestamp (as fallback)
          const isSimilar = prev.some(m =>
            m.content === msg.content &&
            m.timestamp === msg.timestamp &&
            m.sender === msg.sender
          );

          if (isDuplicate || isSimilar) return prev;
          return [...prev, msg];

        });

      });
    });
    
    console.log('[ChatBox] after subscribe, isConnected?', socketService.isConnected());
    return unsubscribe;
  }, [currentChatId, token]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentChatId || !user?.id) return;
    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    const tempMessage: Message = {
      id: tempId,
      chatId: currentChatId,
      sender: user.id,
      content: messageContent,
      messageType: 'text',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      setIsTyping(true);
      const response = await chatService.sendMessage(currentChatId, messageContent);
      console.log("Sent message response:", response);

      // Real message will replace this via socket update
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      
      // Optionally: remove the temp message
      setMessages(prev => prev.filter(m => m.id !== tempId));

      // Restore the unsent message
      setNewMessage(messageContent);
    } finally {
      setIsTyping(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageStyle = (message: Message) => {
    const isSystem = message.messageType === 'system';
    const isAI = message.messageType === 'ai_response';
    const isCurrentUser =
      message.sender === 'user' || message.sender === user?.id;
    const isAgent = message.sender && typeof message.sender === 'string' && message.sender !== user?.id;

    if (isSystem || isAI) return 'bg-gray-200 text-black self-start';
    if (isCurrentUser) return 'bg-blue-500 text-white self-end';
    if (isAgent) return 'bg-green-200 text-black self-start';

    return 'bg-gray-100 text-black self-start';
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);


  console.log('All my chat',messages)
  return (
    <div className="flex flex-col h-[500px] w-full bg-gray-50 relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {/* Scrollable Chat Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
      >
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === user?.id ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`px-4 py-3 rounded-2xl max-w-[80%] break-words shadow-sm ${getMessageStyle(msg)}`}
            >
              <div className="text-sm">{msg.content}</div>
              <div className="text-xs mt-1 opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <div className="border-t p-4 bg-white shadow-inner">
        <div className="relative">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Type your message..."
            className="w-full p-3 pr-24 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
          <button
              onClick={handleSendMessage}
              className="absolute right-2 bottom-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isLoading || !newMessage.trim()}
            >
              <span>Send</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;


