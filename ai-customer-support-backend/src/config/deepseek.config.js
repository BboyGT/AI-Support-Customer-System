const axios = require('axios');

const deepseek = {
  chat: {
    completions: {
      create: async ({ model = 'deepseek/deepseek-r1-distill-llama-70b:free', messages }) => {
        try {
          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model,
              messages,
              temperature: 0.7,
              max_tokens: 150
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
                'X-Title': 'AI Customer Support',
                'Content-Type': 'application/json'
              }
            }
          );

          return response.data;
        } catch (error) {
          console.error('OpenRouter API Error:', error.response?.data || error.message);
          throw error;
        }
      }
    }
  }
};

module.exports = deepseek;
