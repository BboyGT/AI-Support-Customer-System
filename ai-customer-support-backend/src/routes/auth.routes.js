const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/user.model');
const { Permit } = require('permitio');

const router = express.Router();
const permit = new Permit({
  token: process.env.PERMIT_API_KEY,
  pdp: process.env.PERMIT_PDP_URL,
  env: process.env.PERMIT_ENVIRONMENT,
  // projectId: process.env.PERMIT_PROJECT_ID
});

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['customer', 'agent', 'supervisor'])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User(validatedData);
    const validRoles = ['customer', 'agent', 'supervisor'];
    if (!validRoles.includes(user.role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    await user.save();

    // Create user in Permit.io with role and name
    try {
      await permit.api.syncUser({
        key: user._id.toString(),
        email: user.email,
        attributes: {
          firstName: user.name,
          role: user.role
        }
      });
      // ✅ Assign role to user (this is what's missing)
      await permit.api.assignRole({
        user: user._id.toString(),
        role: user.role, // 'customer', 'agent', 'supervisor'
        tenant: 'default' // or set dynamically based on your model
      });
      console.log('✅ User synced to Permit')
    } catch (err){
      console.log('❌ Permit sync error:', err.response?.data || err.message)
    }
   

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    // Find user and check password
    const user = await User.findOne({ email: validatedData.email });
    if (!user || !(await user.comparePassword(validatedData.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update online status
    user.isOnline = true;
    user.lastActive = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  try {
    const userId = req.user.userId; // Assuming middleware sets this
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastActive: new Date()
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

module.exports = router;