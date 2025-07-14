require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { Permit } = require('permitio');

// Import routes and middleware
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const userRoutes = require('./routes/user.routes');
const ticketRoutes = require('./routes/ticket.routes');
const authMiddleware = require('./middleware/auth.middleware');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
});

io.engine.on('connection_error', (err) => {
  console.error('[Socket.IO] raw engine connection_error:', err.message);
});

io.use((socket, next) => {
  console.log('[Socket.IO] handshake auth data:', socket.handshake.auth);
  next();
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Initialize Permit.io
const permit = new Permit({
  token: process.env.PERMIT_API_KEY,
  pdp: process.env.PERMIT_PDP_URL,
  env: process.env.PERMIT_ENVIRONMENT,
  projectId: process.env.PERMIT_PROJECT_ID
});

// app.get('/test-permit', async (req, res) => {
//   try {
//     // Sample check to see if Permit is returning a valid response
//     const result = await permit.check({
//       userId: 'testUserId',               // This should be a valid user identifier
//       action: 'access_some_resource',     // The action you want to check
//       resource: {
//         type: 'some_resource_type'       // Resource type you're checking access to
//       }
//     });

//     res.json({ message: 'Permit.io check successful', result });
//   } catch (error) {
//     console.error('Permit.io check failed:', error);
//     res.status(500).json({ message: 'Permit.io check failed' });
//   }
// });

app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/tickets', authMiddleware, ticketRoutes);

// Socket.io event handlers
require('./socket/chatHandler')(io);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});