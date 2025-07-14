const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Can be null for AI-generated messages
    required: false
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['user', 'ai_response', 'system'],
    default: 'user'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
messageSchema.index({ chatId: 1, timestamp: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;