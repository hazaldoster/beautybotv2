#!/usr/bin/env node

/**
 * Script to run tests for the Supabase to Qdrant vectorization system
 * 
 * Usage: node test.js [test1] [test2] ...
 * Available tests:
 *   embedding - Test the embedding model
 *   openai    - Test the OpenAI API key
 *   search    - Test the search functionality
 *   all       - Run all tests
 */

// Register TypeScript
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
  },
});

// Run the tests script with the provided arguments
require('./src/scripts/tests.ts'); 