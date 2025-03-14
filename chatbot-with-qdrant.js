const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.REACT_APP_QDRANT_URL,
  apiKey: process.env.REACT_APP_QDRANT_API_KEY,
  checkCompatibility: false
});

const COLLECTION_NAME = process.env.REACT_APP_QDRANT_COLLECTION || 'product_inventory';

/**
 * Generate embeddings for a text using OpenAI
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating OpenAI embedding:", error);
    throw error;
  }
}

/**
 * Search for relevant products in Qdrant
 */
async function searchProducts(query, limit = 5) {
  try {
    // Generate embedding for the query
    const embedding = await generateEmbedding(query);
    
    // Search Qdrant
    const searchResult = await qdrantClient.search(COLLECTION_NAME, {
      vector: embedding,
      limit: limit,
      with_payload: true,
    });
    
    return searchResult;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

/**
 * Format product data as context for OpenAI
 */
function formatProductsAsContext(products) {
  if (!products || products.length === 0) {
    return "No relevant products found.";
  }
  
  let context = "Here are some relevant products that might help answer the question:\n\n";
  
  products.forEach((product, index) => {
    context += `Product ${index + 1}: ${product.payload.name}\n`;
    context += `Category: ${product.payload.subcategory}\n`;
    context += `Price: ${product.payload.price}\n`;
    if (product.payload.rating) {
      context += `Rating: ${product.payload.rating}/5\n`;
    }
    context += `URL: ${product.payload.url}\n\n`;
  });
  
  return context;
}

/**
 * Get response from OpenAI based on query and context
 */
async function getOpenAIResponse(query, context) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful beauty product assistant. Answer questions based on the product information provided. 
                   If the information needed is not in the context, say you don't have enough information about that specific detail.
                   Always be helpful, concise, and accurate. If asked about products not in the context, suggest similar products from the context.`
        },
        {
          role: "user",
          content: `Context information about beauty products:\n${context}\n\nUser question: ${query}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error getting OpenAI response:', error);
    return "Sorry, I encountered an error while processing your request.";
  }
}

/**
 * Main function to answer product-related questions
 */
async function answerProductQuestion(query) {
  console.log(`Processing query: "${query}"`);
  
  // Search for relevant products
  console.log("Searching for relevant products...");
  const products = await searchProducts(query);
  
  // Format products as context
  const context = formatProductsAsContext(products);
  
  // Get response from OpenAI
  console.log("Getting response from OpenAI...");
  const response = await getOpenAIResponse(query, context);
  
  return response;
}

// Interactive CLI for testing
function startInteractiveCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log("Beauty Product Assistant (type 'exit' to quit)");
  console.log("---------------------------------------------");
  
  function askQuestion() {
    rl.question("\nAsk a question about beauty products: ", async (query) => {
      if (query.toLowerCase() === 'exit') {
        console.log("Goodbye!");
        rl.close();
        return;
      }
      
      try {
        const answer = await answerProductQuestion(query);
        console.log("\nAssistant's response:");
        console.log(answer);
      } catch (error) {
        console.error("Error:", error);
      }
      
      askQuestion();
    });
  }
  
  askQuestion();
}

// If this script is run directly, start the interactive CLI
if (require.main === module) {
  startInteractiveCLI();
}

// Export functions for use in other modules
module.exports = {
  answerProductQuestion,
  searchProducts,
  generateEmbedding
}; 