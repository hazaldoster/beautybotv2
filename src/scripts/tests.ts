// Use require for the embeddings module
const { generateEmbedding, VECTOR_SIZE } = require('../services/embeddings.cjs');
import { searchSimilarProducts } from '../services/qdrant/productSearch';
import { processQuery, classifyQuery, QueryMode, processUserQuery } from '../services/queryClassification';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test the embedding model by generating a simple embedding
 */
async function testEmbeddingModel() {
  console.log('\n=== Testing Embedding Model (OpenAI text-embedding-3-small) ===\n');
  
  try {
    // Try to generate a simple embedding
    console.log('Attempting to generate an embedding...');
    const testText = 'Hello, world! This is a test of the embedding model.';
    console.log(`Input text: "${testText}"`);
    
    const embedding = await generateEmbedding(testText);
    
    // Check if the embedding has the correct dimensions
    if (embedding && embedding.length === VECTOR_SIZE) {
      console.log('SUCCESS: Embedding generated successfully!');
      console.log(`Generated an embedding with ${embedding.length} dimensions (expected ${VECTOR_SIZE}).`);
      console.log('First 5 values:', embedding.slice(0, 5));
    } else {
      console.error('ERROR: Generated embedding has incorrect dimensions.');
      console.error(`Expected ${VECTOR_SIZE} dimensions, but got ${embedding ? embedding.length : 0}.`);
    }
  } catch (error) {
    console.error('ERROR: Failed to generate an embedding.');
    console.error('Error details:', error);
  }
}

/**
 * Test the OpenAI API key by generating a simple embedding
 */
async function testOpenAIKey() {
  console.log('\n=== Testing OpenAI API Key ===\n');
  
  // Get API key from environment
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  // Check if API key is set
  if (!apiKey) {
    console.error('ERROR: OpenAI API key is not set in the .env file.');
    console.error('Please add your API key to the .env file as REACT_APP_OPENAI_API_KEY.');
    return;
  }
  
  // Check if API key is a placeholder
  if (apiKey.includes('your-actual-openai-api-key-here') || apiKey === 'your_openai_api_key_here') {
    console.error('ERROR: OpenAI API key is still set to the placeholder value.');
    console.error('Please replace it with your actual API key in the .env file.');
    return;
  }
  
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: apiKey,
  });
  
  try {
    // Try to generate a simple embedding
    console.log('Attempting to generate an embedding...');
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: 'Hello, world!',
    });
    
    // Check if the response contains an embedding
    if (response.data && response.data[0] && response.data[0].embedding) {
      console.log('SUCCESS: OpenAI API key is working correctly!');
      console.log(`Generated an embedding with ${response.data[0].embedding.length} dimensions.`);
    } else {
      console.error('ERROR: Received an unexpected response from OpenAI API.');
      console.error('Response:', response);
    }
  } catch (error: any) {
    console.error('ERROR: Failed to generate an embedding.');
    
    if (error.status === 401) {
      console.error('Authentication error: Your OpenAI API key is invalid or has expired.');
      console.error('Please check your API key in the .env file.');
    } else if (error.status === 429) {
      console.error('Rate limit exceeded: You have exceeded your OpenAI API rate limit.');
    } else {
      console.error('Error details:', error);
    }
  }
}

/**
 * Test the search functionality
 */
async function testSearch() {
  console.log('\n=== Testing Search Functionality ===\n');
  
  try {
    // Test search with a specific query
    const query = 'kozmetik ürünleri makyaj';
    console.log(`Searching for: "${query}"`);
    
    const results = await searchSimilarProducts(query, 5);
    
    console.log(`Found ${results.length} results:`);
    
    // Display the results
    results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`);
      console.log(`- Score: ${result.score.toFixed(4)}`);
      console.log(`- Product ID: ${result.payload.product_id}`);
      console.log(`- Name: ${result.payload.name}`);
      console.log(`- Price: ${result.payload.price}`);
      console.log(`- Subcategory: ${result.payload.subcategory}`);
    });
    
    console.log('\nSearch test completed successfully!');
  } catch (error) {
    console.error('Error testing search:', error);
  }
}

/**
 * Test the query classification and routing system
 */
async function testQueryClassification() {
  console.log('\n=== Testing Query Classification & Routing ===\n');
  
  // Test queries for different modes
  const testQueries = [
    {
      description: "Direct SQL Query",
      query: "What are the top 5 highest-rated lipsticks in our database?"
    },
    {
      description: "Semantic Search Query",
      query: "Can you recommend some good face creams for dry skin?"
    }
  ];
  
  // Test classification only
  console.log('Testing Query Classification:');
  for (const test of testQueries) {
    try {
      console.log(`\n[${test.description}]`);
      console.log(`Query: "${test.query}"`);
      
      const classification = await classifyQuery(test.query);
      console.log('Classification:', JSON.stringify(classification, null, 2));
      
      // Log the mode
      console.log(`Mode: ${classification.mode}`);
    } catch (error) {
      console.error(`Error testing classification for "${test.query}":`, error);
    }
  }
  
  // Test a single query with full processing
  try {
    const query = "What are the best makeup products under 100 TL?";
    console.log(`\nProcessing full query: "${query}"`);
    
    const answer = await processQuery(query);
    console.log('\nFinal Answer:');
    console.log(answer);
  } catch (error) {
    console.error('Error processing query:', error);
  }
}

/**
 * Test the processUserQuery function (Next.js API route simulation)
 */
async function testProcessUserQuery() {
  console.log('\n=== Testing Process User Query Function ===\n');
  
  // Test a single query with the new processUserQuery function
  try {
    const query = "What are the best makeup products for sensitive skin?";
    console.log(`Processing query: "${query}"`);
    
    const answer = await processUserQuery(query);
    console.log('\nFinal Answer:');
    console.log(answer);
  } catch (error) {
    console.error('Error processing query:', error);
  }
}

/**
 * Main function to run tests based on command-line arguments
 */
async function runTests() {
  // Get command-line arguments
  const args = process.argv.slice(2);
  
  // If no arguments, show usage
  if (args.length === 0) {
    console.log('Usage: node test.js [test1] [test2] ...');
    console.log('Available tests:');
    console.log('  embedding - Test the embedding model');
    console.log('  openai    - Test the OpenAI API key');
    console.log('  search    - Test the search functionality');
    console.log('  query     - Test the query classification and routing');
    console.log('  nextjs    - Test the Next.js API route simulation');
    console.log('  all       - Run all tests');
    return;
  }
  
  // Run tests based on arguments
  for (const arg of args) {
    switch (arg.toLowerCase()) {
      case 'embedding':
        await testEmbeddingModel();
        break;
      case 'openai':
        await testOpenAIKey();
        break;
      case 'search':
        await testSearch();
        break;
      case 'query':
        await testQueryClassification();
        break;
      case 'nextjs':
        await testProcessUserQuery();
        break;
      case 'all':
        await testEmbeddingModel();
        await testOpenAIKey();
        await testSearch();
        await testQueryClassification();
        await testProcessUserQuery();
        break;
      default:
        console.error(`Unknown test: ${arg}`);
        break;
    }
  }
}

// Run the tests
runTests(); 