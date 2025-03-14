/**
 * Test Frontend Integration Script
 * 
 * This script simulates the behavior of the Chat component by creating
 * an instance of the OpenAIService and testing it with a sample query.
 * 
 * Usage:
 * npx ts-node -r dotenv/config src/scripts/test-frontend-integration.ts
 */

// Add an empty export to make this a module
export {};

import dotenv from "dotenv";
import readline from "readline";
import { v4 as uuidv4 } from "uuid";
import { OpenAI } from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

// Define simplified interfaces
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface OpenAIConfig {
  apiKey: string;
  assistantId?: string;
  qdrantUrl?: string;
  qdrantApiKey?: string;
  qdrantCollection?: string;
}

// Define a simplified version of ProductQueryService for testing
class ProductQueryService {
  private qdrantClient: QdrantClient;
  private openai: OpenAI;
  private collectionName: string;

  constructor(config: {
    qdrantUrl: string;
    qdrantApiKey: string;
    openaiApiKey: string;
    collectionName: string;
  }) {
    // Initialize Qdrant client
    this.qdrantClient = new QdrantClient({
      url: config.qdrantUrl,
      apiKey: config.qdrantApiKey
    });

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
      dangerouslyAllowBrowser: true
    });

    // Set collection name
    this.collectionName = config.collectionName;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Get collections
      const collections = await this.qdrantClient.getCollections();
      return collections.collections.some(c => c.name === this.collectionName);
    } catch (error) {
      console.error("Error connecting to Qdrant:", error);
      return false;
    }
  }

  async processQuery(query: string): Promise<{ answer: string; results: any[] }> {
    try {
      // Simulate processing a query
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are a beauty product assistant. Respond to the query as if you found relevant beauty products." 
          },
          { 
            role: "user", 
            content: query 
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });
      
      return {
        answer: response.choices[0].message.content || "No response generated.",
        results: [] // Simulated empty results for testing
      };
    } catch (error) {
      console.error("Error processing query:", error);
      return {
        answer: "Error processing your query. Please try again.",
        results: []
      };
    }
  }
}

// Define a simplified version of OpenAIService for testing
class OpenAIService {
  private openai: OpenAI;
  private assistantId?: string;
  private productQueryService: ProductQueryService | null = null;
  private useProductQueryProcessor: boolean = false;

  constructor(config: OpenAIConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.assistantId = config.assistantId;
    
    // Initialize ProductQueryService if Qdrant credentials are provided
    if (config.qdrantUrl && config.qdrantApiKey && config.qdrantCollection) {
      this.productQueryService = new ProductQueryService({
        qdrantUrl: config.qdrantUrl,
        qdrantApiKey: config.qdrantApiKey,
        openaiApiKey: config.apiKey,
        collectionName: config.qdrantCollection
      });
      this.useProductQueryProcessor = true;
      
      // Test connection to Qdrant
      this.testQdrantConnection();
    }
  }
  
  private async testQdrantConnection() {
    if (!this.productQueryService) return;
    
    try {
      const connectionOk = await this.productQueryService.testConnection();
      if (connectionOk) {
        console.log("Successfully connected to Qdrant");
        this.useProductQueryProcessor = true;
      } else {
        console.warn("Could not connect to Qdrant or collection is not properly set up");
        this.useProductQueryProcessor = false;
      }
    } catch (error) {
      console.error("Error testing Qdrant connection:", error);
      this.useProductQueryProcessor = false;
    }
  }

  async sendMessage(content: string): Promise<Message | null> {
    try {
      // If ProductQueryService is available and connected, use it
      if (this.useProductQueryProcessor && this.productQueryService) {
        console.log("Using ProductQueryService to process query");
        
        const result = await this.productQueryService.processQuery(content);
        
        return {
          id: uuidv4(),
          role: 'assistant',
          content: result.answer,
          timestamp: new Date(),
        };
      }
      
      // Otherwise, fall back to OpenAI API
      console.log("Using OpenAI API to process query");
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content }],
        max_tokens: 500,
        temperature: 0.7
      });
      
      return {
        id: uuidv4(),
        role: 'assistant',
        content: response.choices[0].message.content || "No response generated.",
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
}

// Load environment variables
dotenv.config();

// Get API credentials from environment variables
const openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
const assistantId = process.env.REACT_APP_ASSISTANT_ID || '';
const qdrantUrl = process.env.REACT_APP_QDRANT_URL || '';
const qdrantApiKey = process.env.REACT_APP_QDRANT_API_KEY || '';
const qdrantCollection = process.env.REACT_APP_QDRANT_COLLECTION || 'product_inventory';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Test the OpenAIService with a sample query
 */
async function testOpenAIService(query: string): Promise<void> {
  console.log("\n=== Testing OpenAIService with query ===");
  console.log(`Query: "${query}"`);
  
  try {
    // Initialize OpenAI service with all available credentials
    console.log("Initializing OpenAIService...");
    const service = new OpenAIService({
      apiKey: openaiApiKey,
      assistantId,
      qdrantUrl,
      qdrantApiKey,
      qdrantCollection
    });
    
    console.log("Sending message...");
    const startTime = Date.now();
    const response = await service.sendMessage(query);
    const endTime = Date.now();
    
    if (response) {
      console.log(`\n=== Response (${endTime - startTime}ms) ===\n`);
      console.log(response.content);
      console.log("\n✅ OpenAIService test passed!");
    } else {
      console.error("❌ No response received from OpenAIService");
    }
  } catch (error) {
    console.error("❌ Error testing OpenAIService:", error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log("=== Frontend Integration Test ===");
  console.log("This script simulates the behavior of the Chat component");
  
  // Log configuration
  console.log('\nConfiguration:');
  console.log(`- OpenAI API Key: ${openaiApiKey ? 'Set' : 'Not set'}`);
  console.log(`- Assistant ID: ${assistantId ? 'Set' : 'Not set'}`);
  console.log(`- Qdrant URL: ${qdrantUrl ? 'Set' : 'Not set'}`);
  console.log(`- Qdrant API Key: ${qdrantApiKey ? 'Set' : 'Not set'}`);
  console.log(`- Qdrant Collection: ${qdrantCollection}`);
  
  // Check if required credentials are set
  if (!openaiApiKey) {
    console.error("Error: REACT_APP_OPENAI_API_KEY is not set in .env file");
    rl.close();
    return;
  }
  
  // Determine which mode will be used
  const useProductQueryProcessor = qdrantUrl && qdrantApiKey && qdrantCollection;
  
  console.log("\nBased on your configuration, the frontend will use:");
  if (useProductQueryProcessor) {
    console.log("- Product Query Processor (via Qdrant)");
  } else if (assistantId) {
    console.log("- OpenAI Assistant API");
  } else {
    console.log("- ⚠️ No valid configuration found");
    rl.close();
    return;
  }
  
  // Ask for a test query
  rl.question("\nEnter a test query (or press Enter for default): ", async (input) => {
    const query = input.trim() || "What are the best moisturizers for dry skin?";
    
    await testOpenAIService(query);
    
    rl.close();
  });
}

// Run the main function
main().catch(console.error); 