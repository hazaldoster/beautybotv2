import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

// No need for embedding pipeline anymore since we'll use OpenAI

/**
 * Generate embeddings for a text using OpenAI
 */
async function generateEmbedding(text: string, openai: OpenAI): Promise<number[]> {
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
 * Format product data as context for OpenAI
 */
function formatProductsAsContext(products: any[]): string {
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
 * QdrantOpenAIService class that integrates Qdrant search with OpenAI
 */
export class QdrantOpenAIService {
  private qdrantClient: QdrantClient;
  private openai: OpenAI;
  private collectionName: string;

  constructor(
    qdrantUrl: string,
    qdrantApiKey: string,
    openaiApiKey: string,
    collectionName: string = 'product_inventory'
  ) {
    // Initialize Qdrant client
    this.qdrantClient = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey,
      checkCompatibility: false
    });

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
      dangerouslyAllowBrowser: true // Allow usage in browser
    });

    this.collectionName = collectionName;
  }

  /**
   * Search for relevant products in Qdrant
   */
  async searchProducts(query: string, limit: number = 5): Promise<any[]> {
    try {
      // Generate embedding for the query
      const embedding = await generateEmbedding(query, this.openai);
      
      // Search Qdrant
      const searchResult = await this.qdrantClient.search(this.collectionName, {
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
   * Get response from OpenAI based on query and context
   */
  async getOpenAIResponse(query: string, context: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
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
      
      return response.choices[0].message.content || "No response generated.";
    } catch (error) {
      console.error('Error getting OpenAI response:', error);
      return "Sorry, I encountered an error while processing your request.";
    }
  }

  /**
   * Main function to answer product-related questions
   */
  async answerProductQuestion(query: string): Promise<string> {
    console.log(`Processing query: "${query}"`);
    
    // Search for relevant products
    console.log("Searching for relevant products...");
    const products = await this.searchProducts(query);
    
    // Format products as context
    const context = formatProductsAsContext(products);
    
    // Get response from OpenAI
    console.log("Getting response from OpenAI...");
    const response = await this.getOpenAIResponse(query, context);
    
    return response;
  }
}

export default QdrantOpenAIService; 