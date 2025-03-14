const dotenv = require('dotenv');
const { OpenAI } = require('openai');

// Load environment variables
dotenv.config();

// OpenAI embedding model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const VECTOR_SIZE = 1536; // OpenAI text-embedding-3-small size

// Initialize OpenAI client (lazy-loaded)
let openaiClient = null;

/**
 * Get the OpenAI client, initializing it if necessary
 * @returns The OpenAI client
 */
async function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please set REACT_APP_OPENAI_API_KEY in your .env file.');
    }
    
    console.log('Initializing OpenAI client...');
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    console.log('OpenAI client initialized successfully!');
  }
  return openaiClient;
}

/**
 * Generate embeddings for a text using OpenAI's embedding model
 * @param text The text to generate embeddings for
 * @returns An array of embedding values
 */
async function generateEmbedding(text) {
  try {
    // Get the OpenAI client
    const client = await getOpenAIClient();
    
    // Generate embedding
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    });
    
    // Return the embedding
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batches
 * @param texts Array of texts to generate embeddings for
 * @param batchSize Number of texts to process in each batch
 * @returns Array of embedding arrays
 */
async function generateEmbeddingsBatch(texts, batchSize = 10) {
  const embeddings = [];
  
  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    try {
      // Get the OpenAI client
      const client = await getOpenAIClient();
      
      // Generate embeddings for the batch
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        encoding_format: 'float',
      });
      
      // Extract embeddings from response
      const batchEmbeddings = response.data.map(item => item.embedding);
      embeddings.push(...batchEmbeddings);
      
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
      
      // Add a small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error processing batch starting at index ${i}:`, error);
      throw error;
    }
  }
  
  return embeddings;
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  VECTOR_SIZE
}; 