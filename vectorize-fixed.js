#!/usr/bin/env node

/**
 * Fixed script to run the vectorization process with the correct Qdrant URL
 * 
 * Usage: node vectorize-fixed.js
 */

// Register TypeScript
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
  },
});

// Import required modules
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

console.log('Starting fixed vectorization process...');

// Temporarily modify the src/config/qdrant.ts file to ensure correct URL is used
const qdrantConfigPath = path.join(__dirname, 'src', 'config', 'qdrant.ts');
let originalQdrantConfig = '';

try {
  // Backup the original file
  originalQdrantConfig = fs.readFileSync(qdrantConfigPath, 'utf8');
  
  // Get the correct Qdrant URL from environment
  const qdrantUrl = process.env.REACT_APP_QDRANT_URL || '';
  const qdrantApiKey = process.env.REACT_APP_QDRANT_API_KEY || '';
  
  console.log(`Using Qdrant URL: ${qdrantUrl}`);
  console.log(`Using API Key: ${qdrantApiKey ? 'Configured' : 'Missing'}`);
  
  // Create modified config that uses the cloud Qdrant URL directly
  const modifiedConfig = `import { QdrantClient } from '@qdrant/js-client-rest';
// Use require for the embeddings module
const { VECTOR_SIZE } = require('../services/embeddings.cjs');
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Qdrant configuration from environment variables
export const QDRANT_API_KEY = '${qdrantApiKey}';

// Use the direct Qdrant URL, not the proxy
export const PROXY_URL = '';
export const QDRANT_URL = '${qdrantUrl}';

// Collection configuration
export const COLLECTION_NAME = process.env.REACT_APP_QDRANT_COLLECTION || 'product_inventory';
// Using the vector size from the embeddings service (1536 for OpenAI text-embedding-3-small)

// Log the configuration
console.log('Qdrant Configuration:');
console.log(\`- Using URL: \${QDRANT_URL}\`);
console.log(\`- Using Proxy: \${PROXY_URL ? 'Yes' : 'No'}\`);
console.log(\`- Collection: \${COLLECTION_NAME}\`);

// Initialize Qdrant client with improved configuration
export const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  timeout: 10000, // Increase timeout to 10 seconds
  checkCompatibility: false, // Skip compatibility checks
});`;

  // Write the modified config
  fs.writeFileSync(qdrantConfigPath, modifiedConfig);
  console.log('Modified Qdrant config to use direct cloud URL');
  
  // Run the vectorization script
  console.log('Running vectorization process...');
  const vectorizeSupabaseData = require('./src/scripts/vectorizeSupabaseData').default;
  
  // Run with error handling
  (async () => {
    try {
      await vectorizeSupabaseData();
      console.log('Vectorization completed successfully!');
    } catch (error) {
      console.error('Error during vectorization:', error);
    } finally {
      // Restore the original config file
      fs.writeFileSync(qdrantConfigPath, originalQdrantConfig);
      console.log('Restored original Qdrant config');
    }
  })();
  
} catch (error) {
  console.error('Error in vectorization process:', error);
  
  // Restore the original config file if it was backed up
  if (originalQdrantConfig) {
    fs.writeFileSync(qdrantConfigPath, originalQdrantConfig);
    console.log('Restored original Qdrant config due to error');
  }
  
  process.exit(1);
} 