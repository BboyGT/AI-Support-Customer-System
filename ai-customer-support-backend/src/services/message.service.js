const { Message, Chat } = require('../models/chat.model');
const deepseek = require('../config/deepseek.config');
const { z } = require('zod');
const Ticket = require('../models/ticket.model');
// const { messageSchema } = require('../validators/messageSchema'); // Your Zod schema

async function saveMessageAndRespond({ chatId, senderId, content, userRole }) {
  const messageSchema = z.object({
    content: z.string().min(1),
    chatId: z.string().optional()
  });

  // 1. Zod Validation
  const validated = messageSchema.parse({ content });

  // 2. Prevent empty content
  if (!validated.content || validated.content.trim() === '') {
    throw new Error('Content cannot be empty');
  }

  // 3. Save user message
  const message = new Message({
    chatId,
    sender: senderId || null,
    content: validated.content,
    messageType: userRole === 'customer' ? 'text' : 'text'
  });
  await message.save();

  // 4. Update chat's lastMessage time
  await Chat.findByIdAndUpdate(chatId, { lastMessage: new Date() });

  // 5. If customer, respond with AI
  let aiMessage = null;
  if (userRole === 'customer') {

    // Find the ticket by chatId
    const ticket = await Ticket.findOne({ chatId });

    // Don't respond with AI if the ticket has an assigned agent
    if (ticket?.assignedAgent) {
      console.log('Ticket is assigned to an agent. Skipping AI response.');
      return { message, aiMessage: null };
    }

    const aiResponse = await deepseek.chat.completions.create({
      model: 'deepseek/deepseek-r1-distill-llama-70b:free',
      messages: [
        { role: 'system', content: 'You are a helpful customer support assistant.' },
        { role: 'user', content: validated.content }
      ]
    });

    let aiContent = aiResponse.choices[0].message.content || aiResponse.choices[0].message.reasoning;
    aiContent = cleanAIContent(aiContent);

    if (aiContent && aiContent.trim()) {
      aiMessage = new Message({
        chatId,
        sender: null,
        content: aiContent,
        messageType: 'ai_response'
      });
      await aiMessage.save();
    }
  }

  return { message, aiMessage };
}

module.exports = { saveMessageAndRespond };
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