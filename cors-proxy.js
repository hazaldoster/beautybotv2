const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();

// Enable CORS for all routes with specific configuration based on Qdrant documentation
app.use(cors({
  origin: '*',  // Allow all origins - for production, you might want to restrict this
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'api-key', 'Authorization'],
  credentials: true,
  maxAge: 86400  // Cache preflight requests for 24 hours (same as Qdrant's max_age_secs)
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Get Qdrant credentials from environment variables
const qdrantUrl = process.env.REACT_APP_QDRANT_URL;
const qdrantApiKey = process.env.REACT_APP_QDRANT_API_KEY;

if (!qdrantUrl) {
  console.error('REACT_APP_QDRANT_URL is not set in .env file');
  process.exit(1);
}

console.log(`Setting up proxy to Qdrant at: ${qdrantUrl}`);

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Proxy server is running' });
});

// Add a debug endpoint to check headers
app.get('/debug-headers', (req, res) => {
  res.status(200).json({ 
    headers: req.headers,
    message: 'These are the headers received by the proxy'
  });
});

// Proxy all requests to Qdrant
app.use('/', createProxyMiddleware({
  target: qdrantUrl,
  changeOrigin: true,
  secure: true,
  pathRewrite: {
    '^/api': '', // Remove /api prefix if needed
  },
  onProxyReq: (proxyReq, req) => {
    // Add API key to all requests
    if (qdrantApiKey) {
      proxyReq.setHeader('api-key', qdrantApiKey);
    }
    
    // Log outgoing requests
    console.log(`Proxying ${req.method} request to: ${req.originalUrl}`);
    console.log(`Request headers:`, req.headers);
  },
  onProxyRes: (proxyRes, req) => {
    // Add CORS headers to the response
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, api-key, Authorization';
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    proxyRes.headers['Access-Control-Max-Age'] = '86400';
    
    // Log response status
    console.log(`Response from Qdrant: ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`);
    console.log(`Response headers:`, proxyRes.headers);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({
      error: 'Proxy error',
      message: err.message
    });
  }
}));

const PORT = process.env.PROXY_PORT || 3001;

// Handle server errors
const server = app.listen(PORT, () => {
  console.log(`CORS proxy server running on port ${PORT}`);
  console.log(`Access Qdrant through: http://localhost:${PORT}`);
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('Shutting down proxy server...');
  server.close(() => {
    console.log('Proxy server shut down');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Keep the server running despite errors
}); 