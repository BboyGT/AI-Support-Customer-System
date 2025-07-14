const express = require('express');
const { z } = require('zod');
const Ticket = require('../models/ticket.model');
const { Chat, Message } = require('../models/chat.model');
const { Permit } = require('permitio');
// const axios = require('axios');

const router = express.Router();

const deepseek = require('../config/deepseek.config');

const permit = new Permit({
  token: process.env.PERMIT_API_KEY,
  pdp: process.env.PERMIT_PDP_URL,
  env: process.env.PERMIT_ENVIRONMENT
});

// Validation schemas
const ticketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  // category: z.enum(['technical', 'billing', 'account', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
});

router.post('/', async (req, res) => {
  try {
    // Step 1: Validate request
    const validatedData = ticketSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ message: 'Validation error', errors: validatedData.error.errors });
    }

    const { title, description } = validatedData.data;

    // Step 2: Check permissions
    const hasPermission = await permit.check(req.user.userId, 'create', 'ticket');
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    // Step 3: Create chat
    const chat = await new Chat({
      participants: [req.user.userId],
      type: 'customer_support'
    }).save();

    // Step 4: AI priority suggestion via DeepSeek
    let priority = 'medium'; // default fallback
    try {
      const aiResponse = await deepseek.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a customer support ticket analyzer. Suggest a priority level (low, medium, high, urgent) based on the ticket description.'
          },
          {
            role: 'user',
            content: `Title: ${title}\nDescription: ${description}`
          }
        ]
      });
      console.log('AI Response:', aiResponse);
      const choice = aiResponse.choices?.[0];
      console.log('AI Choice:', choice);
      const suggestion = choice?.[0]?.message?.content?.toLowerCase() || '';
      if (suggestion.includes('urgent')) priority = 'urgent';
      else if (suggestion.includes('high')) priority = 'high';
      else if (suggestion.includes('low')) priority = 'low';
    } catch (err) {
      console.error('AI priority suggestion failed:', err.message);
      // Use default priority
    }

    // Step 5: Create ticket and system message
    const ticket = await new Ticket({
      ...validatedData.data,
      customer: req.user.userId,
      chatId: chat._id,
      priority
    }).save();

    await new Message({
      chatId: chat._id,
      sender: req.user.userId,
      content: `Ticket created: ${title}\n\n${description}`,
      messageType: 'system'
    }).save();

    // Step 6: Respond with success
    return res.status(201).json(ticket);
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
});

// router.post('/', async (req, res) => {
//   try {
//     // 1. Validate input data
//     let validatedData;
//     try {
//       validatedData = ticketSchema.parse(req.body);
//     } catch (validationError) {
//       return res.status(400).json({ message: 'Validation error', errors: validationError.errors });
//     }

//     // 2. Permission check with Permit.io
//     try {
//       const hasPermission = await permit.check(req.user.userId, 'create', 'ticket');
//       if (!hasPermission) {
//         return res.status(403).json({ message: 'Access denied: insufficient permissions' });
//       }
//     } catch (permError) {
//       console.error('Permission check failed:', permError);
//       return res.status(500).json({ message: 'Failed to verify permissions. Please try again later.' });
//     }

//     // 3. Create the chat record
//     let chat;
//     try {
//       chat = new Chat({
//         participants: [req.user.userId],
//         type: 'customer_support'
//       });
//       await chat.save();
//     } catch (chatError) {
//       console.error('Chat creation failed:', chatError);
//       return res.status(500).json({ message: 'Failed to create chat for the ticket' });
//     }

//     // 4. Get AI-generated priority suggestion using Groq
//     let priority = 'medium'; // default
//     try {
//       const response = await deepseek.chat.completions.create({
//         model: 'deepseek-chat',
//         messages: [
//           {
//             role: 'system',
//             content: 'You are a customer support ticket analyzer. Suggest a priority level (low, medium, high, urgent) based on the ticket description.'
//           },
//           {
//             role: 'user',
//             content: `Title: ${validatedData.title}\nDescription: ${validatedData.description}`
//           }
//         ]
//       });

//       const aiText = response.choices[0].message.content.toLowerCase();
//       if (aiText.includes('urgent')) priority = 'urgent';
//       else if (aiText.includes('high')) priority = 'high';
//       else if (aiText.includes('low')) priority = 'low';

//     } catch (aiError) {
//       console.error('AI priority suggestion failed:', aiError);
//       // AI failed — fallback to 'medium' priority and continue
//     }

//     // 5. Create the ticket and initial message
//     let ticket;
//     try {
//       ticket = new Ticket({
//         ...validatedData,
//         customer: req.user.userId,
//         chatId: chat._id,
//         priority
//       });
//       await ticket.save();

//       // Create initial system message
//       const initialMessage = new Message({
//         chatId: chat._id,
//         sender: req.user.userId,
//         content: `Ticket created: ${validatedData.title}\n\n${validatedData.description}`,
//         messageType: 'system'
//       });
//       await initialMessage.save();
//     } catch (ticketError) {
//       console.error('Ticket creation failed:', ticketError);
//       return res.status(500).json({ message: 'Failed to create ticket' });
//     }

//     // 6. Success response
//     return res.status(201).json(ticket);

//   } catch (unexpectedError) {
//     // Catch any other unhandled errors
//     console.error('Unexpected error in create ticket route:', unexpectedError);
//     return res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
//   }
// });

// Get all tickets (for agents and supervisors)
router.get('/', async (req, res) => {
  try {
    console.log('User ID:', req.user.userId); // Add this line
    const userId = req.user.userId; // Ensure this is the correct field
    console.log('Checking permissions for user:', userId); // Add this line
    const hasPermission = await permit.check(userId, 'read', 'ticket');
    console.log(`Permission check for test user ${req.user.userId}: ${hasPermission}`);
    console.log(hasPermission);
    if (!hasPermission) {
      console.log('Access denied due to missing permission');
      return res.status(403).json({ message: 'Access denied' });
    }

    const tickets = await Ticket.find({})
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get customer's tickets
router.get('/my-tickets', async (req, res) => {
  try {
    const tickets = await Ticket.find({ customer: req.user.userId })
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get agent's assigned tickets
router.get('/assigned', async (req, res) => {
  try {
    const hasPermission = await permit.check(req.user.userId, 'read', 'assigned_tickets');
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tickets = await Ticket.find({ assignedAgent: req.user.userId })
      .populate('customer', 'name email')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign ticket to agent
router.post('/:ticketId/assign', async (req, res) => {
  try {
    const { agentId } = req.body;
    console.log('Assigning ticket:', req.params.ticketId, 'to agent:', agentId);
    const hasPermission = await permit.check(req.user.userId, 'assign', 'ticket');
    console.log('req.user.userId:', req.user.userId); // Add this line
    console.log('hasPermission:', hasPermission); // Add this lin
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      {
        assignedAgent: agentId,
        status: 'in_progress',
        lastUpdated: new Date()
      },
      { new: true }
    ).populate('assignedAgent', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    console.log('Ticket assigned:', ticket);
    res.json(ticket);
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(400).json({ message: error.message });
  }
});

// Escalate ticket
router.post('/:ticketId/escalate', async (req, res) => {
  try {
    const hasPermission = await permit.check(req.user.userId, 'escalate', 'ticket');
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      {
        status: 'escalated',
        escalationReason: req.body.reason,
        priority: 'high'
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update ticket status
router.patch('/:ticketId/status', async (req, res) => {
  try {
    const hasPermission = await permit.check(req.user.userId, 'update', 'ticket');
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      { status: req.body.status },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//GET agent name and email via assigned ticket Id
router.get('/:ticketId/agent', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId)
      .populate('assignedAgent', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!ticket.assignedAgent) {
      return res.status(404).json({ message: 'No agent assigned to this ticket' });
    }

    res.json({
      agent: {
        name: ticket.assignedAgent.name,
        email: ticket.assignedAgent.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;