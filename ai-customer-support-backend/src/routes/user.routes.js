const express = require('express');
const User = require('../models/user.model');
const { Permit } = require('permitio');
const { z } = require('zod');

const router = express.Router();
const permit = new Permit({
  token: process.env.PERMIT_API_KEY,
  pdp: process.env.PERMIT_PDP_URL,
  env: process.env.PERMIT_ENVIRONMENT,
  projectId: process.env.PERMIT_PROJECT_ID
});

// Validation schema
const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional()
});

// Get all users (for supervisors)
router.get('/', async (req, res) => {
  try {
    const hasPermission = await permit.check(req.user.userId, 'read', 'users');
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get online agents
router.get('/agents/online', async (req, res) => {
  try {
    const hasPermission = await permit.check(req.user.userId, 'read', 'agents');
    console.log('from user online agents endpoint', hasPermission);
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const onlineAgents = await User.find({
      role: 'agent',
      // isOnline: true
    }, '-password');

    res.json(onlineAgents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId, '-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.patch('/profile', async (req, res) => {
  try {
    const validatedData = updateUserSchema.parse(req.body);
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      validatedData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user in Permit.io
    await permit.api.syncUser({
      key: user._id.toString(),
      email: user.email,
      firstName: user.name
    });

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get agent performance metrics (for supervisors)
router.get('/agents/metrics', async (req, res) => {
  try {
    const hasPermission = await permit.check(req.user.userId, 'read', 'metrics');
    console.log('from user metrics endpoint', hasPermission);
    // if (!hasPermission) {
    //   return res.status(403).json({ message: 'Access denied' });
    // }

    const agents = await User.find({ role: 'agent' }, '-password');
    const metrics = await Promise.all(agents.map(async (agent) => {
      const totalChats = await Chat.countDocuments({ assignedAgent: agent._id });
      const resolvedChats = await Chat.countDocuments({
        assignedAgent: agent._id,
        status: 'resolved'
      });

      return {
        agentId: agent._id,
        name: agent.name,
        email: agent.email,
        totalChats,
        resolvedChats,
        resolutionRate: totalChats ? (resolvedChats / totalChats) * 100 : 0
      };
    }));

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;