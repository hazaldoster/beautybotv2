#!/usr/bin/env node

/**
 * Script to run the vectorization process from the command line
 * 
 * Usage: node vectorize.js
 */

// Register TypeScript
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
  },
});

// Run the vectorization script directly
console.log('Starting Supabase to Qdrant vectorization process...');

// Import and run the vectorization function
const vectorizeSupabaseData = require('./src/scripts/vectorizeSupabaseData').default;

// Run with error handling
(async () => {
  try {
    await vectorizeSupabaseData();
    console.log('Vectorization completed successfully!');
  } catch (error) {
    console.error('Error during vectorization:', error);
    process.exit(1);
  }
})(); 