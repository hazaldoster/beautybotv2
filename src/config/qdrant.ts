import { QdrantClient } from '@qdrant/js-client-rest';
// Use require for the embeddings module
const { VECTOR_SIZE } = require('../services/embeddings.cjs');
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Qdrant configuration from environment variables
export const QDRANT_API_KEY = process.env.REACT_APP_QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.qk06d67GTiM-SJ6mJfN_dDKQeBN2PwYekwN-c5ixOA4';

// Use the CORS proxy URL if available, otherwise fall back to direct Qdrant URL
export const PROXY_URL = process.env.REACT_APP_PROXY_URL || '';
export const QDRANT_URL = PROXY_URL || process.env.REACT_APP_QDRANT_URL || 'https://df389da3-242b-4c7b-a83e-0acdef79a5ce.europe-west3-0.gcp.cloud.qdrant.io';

// Collection configuration
export const COLLECTION_NAME = process.env.REACT_APP_QDRANT_COLLECTION || 'product_inventory';
// Using the vector size from the embeddings service (1536 for OpenAI text-embedding-3-small)

// Log the configuration
console.log('Qdrant Configuration:');
console.log(`- Using URL: ${QDRANT_URL}`);
console.log(`- Using Proxy: ${PROXY_URL ? 'Yes' : 'No'}`);
console.log(`- Collection: ${COLLECTION_NAME}`);

// Initialize Qdrant client with improved configuration
export const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  timeout: 10000, // Increase timeout to 10 seconds
  checkCompatibility: false, // Skip compatibility checks
}); 