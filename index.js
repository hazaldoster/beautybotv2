const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 