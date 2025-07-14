const { Chat, Message } = require('../models/chat.model');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const deepseek = require('../config/deepseek.config');
const { saveMessageAndRespond } = require('../services/message.service');


module.exports = (io) => {
  // Middleware for authentication
  io.use((socket, next) => {
    console.log('[Socket.IO] auth middleware, token =', socket.handshake.auth.token);
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    // Verify token and set user data
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      console.log('[Socket.IO] auth passed, userId =', decoded.userId);
      next();
    } catch (error) {
      console.error('[Socket.IO] auth failed:', error.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.userId}`);
    console.log(
      `[Socket.IO] client connected: socket.id=${socket.id} userId=${socket.user?.userId}`
    );

    try {
      // Update user's online status
      await User.findByIdAndUpdate(socket.user.userId, {
        isOnline: true,
        lastActive: new Date()
      });

      // Join user's chat rooms
      const userChats = await Chat.find({
        participants: socket.user.userId
      });
      userChats.forEach(chat => {
        socket.join(chat._id.toString());
      });

      // Broadcast user's online status
      io.emit('user_status_change', {
        userId: socket.user.userId,
        status: 'online'
      });

      // ✅ NEW: Use the shared service to handle messages
      socket.on('message', async ({ chatId, content, tempId }) => {
        const sender = socket.user?.userId;
        console.log('Received message from socket:', sender)
        // 1. Create temp message (optimistic)
        const tempMessage = {
          id: tempId, // e.g., "temp-171234..."
          chatId,
          content,
          sender: socket.user.userId,
          messageType: 'text',
          timestamp: new Date().toISOString(),
        };

        console.log('Emitting to clients:', {
          id: tempId,
          chatId,
          content,
          sender,
          messageType: 'text',
          timestamp: new Date().toISOString(),
        });

        io.to(chatId).emit('new_message', {
          id: tempId,
          chatId,
          content,
          sender,
          messageType: 'text',
          timestamp: new Date().toISOString(),
        });

        try {
          const { message, aiMessage } = await saveMessageAndRespond({
            chatId,
            senderId: socket.user.userId,
            content,
            userRole: socket.user.role
          });
          console.log('Message from socket:', message);
          io.to(chatId).emit('new_message', { message: message });
          if (aiMessage) {
            io.to(chatId).emit('new_message', { message: aiMessage });
          }
        } catch (error) {
          console.error('Message handling error:', error.message);
          socket.emit('error', { message: error.message });
        }
      });
      
      // Handle joining chat room
      socket.on('join_chat', async (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.user.userId} joined chat ${chatId}`);
      });

      // Handle leaving chat room
      socket.on('leave_chat', (chatId) => {
        socket.leave(chatId);
        console.log(`User ${socket.user.userId} left chat ${chatId}`);
      });

      // Handle typing status
      socket.on('typing_start', (chatId) => {
        socket.to(chatId).emit('user_typing', {
          userId: socket.user.userId,
          chatId
        });
      });

      socket.on('typing_end', (chatId) => {
        socket.to(chatId).emit('user_stopped_typing', {
          userId: socket.user.userId,
          chatId
        });
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.user.userId}`);
        
        // Update user's offline status
        await User.findByIdAndUpdate(socket.user.userId, {
          isOnline: false,
          lastActive: new Date()
        });

        // Broadcast user's offline status
        io.emit('user_status_change', {
          userId: socket.user.userId,
          status: 'offline'
        });
      });

    } catch (error) {
      console.error('Socket connection error:', error);
    }
  });
};