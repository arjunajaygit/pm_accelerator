require('dotenv').config();
const axios = require('axios');

async function testGroq() {
  const key = process.env.GROQ_API_KEY;
  console.log('Key starts with:', key ? key.substring(0, 10) : 'MISSING');
  
  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: 'Say hello in 3 words' }],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Success:', res.data.choices[0].message.content);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testGroq();
