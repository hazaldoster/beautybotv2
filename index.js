const express = require('express');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'build')));

// Add a health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Log environment variables for debugging (excluding sensitive info)
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  PROXY_URL: process.env.REACT_APP_PROXY_URL,
  QDRANT_URL: process.env.REACT_APP_QDRANT_URL ? 'Set' : 'Not set',
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL ? 'Set' : 'Not set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set'
});

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY
});

// API endpoint to proxy OpenAI requests
app.post('/api/chat', async (req, res) => {
  try {
    const { message, assistantId, threadId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!assistantId) {
      return res.status(400).json({ error: 'Assistant ID is required' });
    }
    
    console.log(`Processing message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Create a thread if one doesn't exist
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
      console.log(`Created new thread: ${currentThreadId}`);
    }
    
    // Add the user message to the thread
    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: message
    });
    
    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistantId
    });
    
    // Poll for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
    
    // Wait for the run to complete (with timeout)
    const startTime = Date.now();
    const TIMEOUT_MS = 30000; // 30 seconds timeout
    
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      // Check for timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        return res.status(504).json({ error: 'Request timed out' });
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check the status again
      runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
    }
    
    if (runStatus.status === 'failed') {
      return res.status(500).json({ error: 'Assistant run failed', details: runStatus });
    }
    
    // Get the messages from the thread
    const messages = await openai.beta.threads.messages.list(currentThreadId);
    
    // Find the most recent assistant message
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    const latestMessage = assistantMessages[0];
    
    if (!latestMessage) {
      return res.status(404).json({ error: 'No response from assistant' });
    }
    
    // Return the response
    return res.json({
      threadId: currentThreadId,
      message: {
        id: latestMessage.id,
        role: latestMessage.role,
        content: latestMessage.content[0].text.value
      }
    });
    
  } catch (error) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 