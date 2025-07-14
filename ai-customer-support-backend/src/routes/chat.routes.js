const express = require('express');
const { Chat, Message } = require('../models/chat.model');
const deepseek = require('../config/deepseek.config');
const { Permit } = require('permitio');
const { z } = require('zod');
const mongoose = require('mongoose');

const router = express.Router();
const permit = new Permit({
  token: process.env.PERMIT_API_KEY,
  pdp: process.env.PERMIT_PDP_URL,
  env: process.env.PERMIT_ENVIRONMENT,
  // projectId: process.env.PERMIT_PROJECT_ID
});



// Validation schemas
const messageSchema = z.object({
  content: z.string().min(1),
  chatId: z.string().optional()
});

// Middleware to check if user can access chat
async function checkChatAccess(req, res, next) {
  try {
    const chatId = req.params.chatId;
    console.log('Chat ID:', chatId);

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }

    // Check if chatId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Invalid Chat ID' });
    }
    const chat = await Chat.findById(chatId);
    
    console.log('Chat:', chat);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const hasAccess = await permit.check(req.user.userId, 'read', 'chat');
    console.log('hasAccess:', hasAccess);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    req.chat = chat;
    next();
  } catch (error) {
    next(error);
  }
}

// Create new chat
router.post('/', async (req, res) => {
  try {
    const hasPermission = await permit.check(req.user.userId, 'create', 'chat');
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const chat = new Chat({
      participants: [req.user.userId],
      type: 'customer_support'
    });
    await chat.save();

    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send message
router.post('/:chatId/messages', checkChatAccess, async (req, res) => {
  try {
    const validatedData = messageSchema.parse(req.body);
    console.log('>>> API route hit:', req.body);
    console.log('Validated Data:', validatedData);

     // Validate content (ensure it's not an empty string)
     if (!validatedData.content || validatedData.content.trim() === '') {
        return res.status(400).json({ message: 'Content cannot be empty' });
     }
    
    const message = new Message({
      chatId: req.chat._id,
      sender: req.user ? req.user.userId : null,
      content: validatedData.content
    });

    await message.save();

    // Update chat's last message timestamp
    req.chat.lastMessage = new Date();
    await req.chat.save();

    let aiMessage = null;

    // If sender is customer, generate AI response
    if (req.user.role === 'customer') {
      try {
        const aiResponse = await deepseek.chat.completions.create({
          model: 'deepseek/deepseek-r1-distill-llama-70b:free',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful customer support assistant.'
            },
            {
              role: 'user',
              content: validatedData.content
            }
          ]
        });

        console.log('AI Response:', aiResponse);

        const choice = aiResponse.choices?.[0];
        console.log('AI Choice:', choice);
        let aiMessageContent = choice[0].message.content || choice[0].message.reasoning;

        if (!aiMessageContent || aiMessageContent.trim() === '') {
          throw new Error('AI response returned empty content');
        }

        const aiContent = cleanAIContent(aiMessageContent);

        console.log('AI Response:', aiMessageContent);
        aiMessage = new Message({
          chatId: req.chat._id,
          sender: null, // AI message
          content: aiContent,
          messageType: 'ai_response'
        });
        await aiMessage.save();

        // Emit both messages through Socket.io
        req.app.get('io').to(req.chat._id).emit('new_message', {
          message: aiMessage
        });
      } catch (error) {
        console.error('AI response error:', error);
      }
    }

    // Emit message through Socket.io
    const io = req.app.get('io');
    const room = req.chat._id.toString();
    if (io) {
      io.to(room).emit('new_message', { message });
      if (aiMessage) {
        io.to(room).emit('new_message', { message: aiMessage });
      }
    } else {
      console.warn('Socket.io instance not found on app');
    }
    // req.app.get('io').to(req.chat._id).emit('new_message', {
    //   message
    // });
    
    console.log('Message:', message);

    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get chat messages
router.get('/:chatId/messages', checkChatAccess, async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.chat._id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's chats
router.get('/', async (req, res) => {
  try {
    const hasPermission = await permit.check(req.user.userId, 'read', 'chat');
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const chats = await Chat.find({
      participants: req.user.userId
    }).populate('participants', 'name email');

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

function cleanAIContent(rawContent) {
  return rawContent
    .replace(/^\\boxed{```(?:\w+)?/, '')    // Remove \boxed{```lang
    .replace(/^\\boxed{/, '')               // Remove \boxed{
    .replace(/^```(?:\w+)?/, '')            // Remove opening ```
    .replace(/```}$/, '')                   // Remove trailing ```}
    .replace(/```$/, '')                    // Remove closing ```
    .replace(/}$/, '')                      // Remove trailing }
    .replace(/^#+\s*/gm, '')                // Remove Markdown headings like #, ##, ###
    .replace(/\*\*(.*?)\*\*/g, '$1')        // Remove wrapped **bold**
    .replace(/\*\*/g, '')                   // Remove unmatched or partial **
    .replace(/[ \t]+/g, ' ')                // Normalize spaces/tabs
    .replace(/\r?\n{2,}/g, '\n\n')          // Collapse multiple newlines
    .trim();
}


