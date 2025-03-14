/**
 * Product Query Processor Script
 * 
 * This script directly processes queries against the updated cosmetic_products collection
 * in Qdrant that contains vectorized product_inventory data from Supabase.
 * 
 * Usage:
 * npx ts-node -r dotenv/config scripts/product-query-processor.ts
 */

import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAI } from "openai";
import readline from "readline";

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
});

// Initialize Qdrant client
const qdrantUrl = process.env.REACT_APP_QDRANT_URL || "";
const qdrantApiKey = process.env.REACT_APP_QDRANT_API_KEY || "";
const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey
});

// Collection name for cosmetic products
const COLLECTION_NAME = process.env.REACT_APP_QDRANT_COLLECTION || "product_inventory";

// Define product payload type
interface ProductPayload {
  product_id: string;
  name: string;
  price?: string;
  subcategory?: string;
  description?: string;
  extra_description?: string;
  mensei?: string;
  renk?: string;
  url?: string;
  [key: string]: any;
}

/**
 * Parse price string to number
 * Handles formats like "175 TL", "1.990 TL", "299,99 TL"
 */
function parsePriceToNumber(priceStr: string | undefined): number | null {
  if (!priceStr) return null;
  
  // Remove currency and trim
  const numStr = priceStr.replace(/TL|₺/g, '').trim();
  
  // Replace comma with dot and remove thousands separator
  const normalized = numStr.replace(/\./g, '').replace(',', '.');
  
  const price = parseFloat(normalized);
  return isNaN(price) ? null : price;
}

/**
 * Generate embeddings using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log(`Generating embedding for text of length ${text.length}...`);
    
    // Use OpenAI embeddings API
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    
    // Return the embedding
    const embedding = response.data[0].embedding;
    
    console.log("Embedding generated successfully");
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Build Qdrant filter based on options
 */
function buildQdrantFilter(options: any): any {
  const conditions: any[] = [];
  
  if (options.subcategory) {
    conditions.push({
      key: 'subcategory',
      match: { value: options.subcategory }
    });
  }
  
  if (options.mensei) {
    conditions.push({
      key: 'mensei',
      match: { value: options.mensei }
    });
  }
  
  if (options.renk) {
    conditions.push({
      key: 'renk',
      match: { value: options.renk }
    });
  }
  
  if (conditions.length === 0) {
    return undefined;
  }
  
  return {
    must: conditions
  };
}

/**
 * Performs semantic search in Qdrant
 * @param query The search query
 * @param filter Optional filter to apply
 * @param efSearch HNSW ef_search parameter (higher = more accurate but slower)
 * @param searchMode 'approximate' or 'exact'
 * @param distanceMetric 'cosine' or 'euclid'
 * @param topK Number of results to return
 * @returns Array of search results
 */
async function semanticSearch(
  query: string,
  filter: any = {},
  efSearch: number = 128,
  searchMode: string = 'approximate',
  distanceMetric: string = 'cosine',
  topK: number = 5
): Promise<any[]> {
  try {
    console.log(`Performing semantic search for: "${query}"`);
    console.log(`Parameters: efSearch=${efSearch}, searchMode=${searchMode}, distanceMetric=${distanceMetric}, topK=${topK}`);
    
    if (Object.keys(filter).length > 0) {
      console.log("Applying filter:", JSON.stringify(filter, null, 2));
    }
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Set search parameters
    const searchParams: any = {
      vector: queryEmbedding,
      limit: topK,
      with_payload: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    };
    
    // Add HNSW search parameters
    if (searchMode === 'approximate') {
      searchParams.params = {
        hnsw_ef: efSearch
      };
    }
    
    // Set search mode
    if (searchMode === 'exact') {
      searchParams.exact = true;
    }
    
    // Perform search
    console.log("Executing search...");
    const searchResults = await qdrantClient.search(COLLECTION_NAME, searchParams);
    
    console.log(`Found ${searchResults.length} results`);
    return searchResults;
  } catch (error) {
    console.error("Error performing semantic search:", error);
    throw error;
  }
}

/**
 * Post-process search results to apply price filtering
 * @param results The search results
 * @param minPrice Minimum price (optional)
 * @param maxPrice Maximum price (optional)
 * @returns Filtered search results
 */
function applyPriceFilter(results: any[], minPrice?: number, maxPrice?: number): any[] {
  if (!minPrice && !maxPrice) {
    return results;
  }
  
  console.log(`Applying price filter: ${minPrice || 'min'} - ${maxPrice || 'max'}`);
  
  return results.filter(result => {
    if (!result.payload) return false;
    
    const payload = result.payload as ProductPayload;
    const price = parsePriceToNumber(payload.price);
    if (!price) return false;
    
    if (minPrice && price < minPrice) return false;
    if (maxPrice && price > maxPrice) return false;
    
    return true;
  });
}

/**
 * Aggregates product information into a context string
 * @param documents Array of product documents
 * @returns Aggregated context string
 */
function aggregateContext(documents: any[]): string {
  console.log("Aggregating context from search results...");
  
  let context = "Here is information about relevant products:\n\n";
  
  documents.forEach((doc, index) => {
    const product = doc.payload as ProductPayload;
    const score = doc.score.toFixed(3);
    
    context += `Product ${index + 1} (Relevance: ${score}):\n`;
    context += `Name: ${product.name || 'Unknown'}\n`;
    context += `Price: ${product.price || 'Not specified'}\n`;
    
    if (product.subcategory) {
      context += `Subcategory: ${product.subcategory}\n`;
    }
    
    if (product.description) {
      context += `Description: ${product.description}\n`;
    }
    
    if (product.extra_description) {
      context += `Additional Info: ${product.extra_description}\n`;
    }
    
    if (product.mensei) {
      context += `Origin: ${product.mensei}\n`;
    }
    
    if (product.renk) {
      context += `Color: ${product.renk}\n`;
    }
    
    if (product.url) {
      context += `URL: ${product.url}\n`;
    }
    
    context += "\n";
  });
  
  return context;
}

/**
 * Generates a prompt for the LLM based on the query and context
 * @param query The user's query
 * @param context The context from search results
 * @returns The generated prompt
 */
function generatePrompt(query: string, context: string): string {
  console.log("Generating prompt for LLM...");
  
  return `
You are a helpful beauty product assistant. Answer the following query based ONLY on the provided product information.
If the information needed is not in the context, say you don't have enough information rather than making things up.
The user may ask in Turkish or English - respond in the same language as the query.

Query: ${query}

Context:
${context}

Answer the query in a helpful, conversational way. Include specific product details when relevant.
If multiple products are mentioned in the context, compare them if appropriate for the query.
If prices are mentioned, include them in your response.
`;
}

/**
 * Calls OpenAI's LLM to generate a final answer
 * @param prompt The prompt to send to the LLM
 * @returns The LLM's response
 */
async function openaiLlmCall(prompt: string): Promise<string> {
  try {
    console.log("Calling OpenAI LLM...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    });
    
    return response.choices[0].message.content || "No response generated.";
  } catch (error) {
    console.error("Error calling OpenAI LLM:", error);
    return "Error generating response. Please try again.";
  }
}

/**
 * Main function to process a query
 * @param query The user's query
 * @param options Search options (subcategory, minPrice, maxPrice, etc.)
 * @param efSearch HNSW ef_search parameter
 * @param searchMode 'approximate' or 'exact'
 * @param distanceMetric 'cosine' or 'euclid'
 * @returns Object containing the answer and search results
 */
async function processQuery(
  query: string,
  options: any = {},
  efSearch: number = 128,
  searchMode: string = 'approximate',
  distanceMetric: string = 'cosine'
): Promise<any> {
  try {
    console.log(`\n=== Processing Query: "${query}" ===\n`);
    
    // Build filter
    const filter = buildQdrantFilter(options);
    
    // Perform semantic search
    const searchResults = await semanticSearch(
      query,
      filter,
      efSearch,
      searchMode,
      distanceMetric,
      10 // Get more results to allow for post-filtering
    );
    
    // Apply price filtering if needed
    const filteredResults = applyPriceFilter(
      searchResults,
      options.minPrice,
      options.maxPrice
    );
    
    // Take top 5 results after filtering
    const topResults = filteredResults.slice(0, 5);
    
    // Aggregate context
    const context = aggregateContext(topResults);
    
    // Generate prompt
    const prompt = generatePrompt(query, context);
    
    // Call LLM
    const answer = await openaiLlmCall(prompt);
    
    return {
      answer,
      results: topResults
    };
  } catch (error) {
    console.error("Error processing query:", error);
    return {
      answer: "Error processing your query. Please try again.",
      results: []
    };
  }
}

/**
 * Display search results in a readable format
 * @param results The search results
 */
function displayResults(results: any[]): void {
  if (results.length === 0) {
    console.log("No results found.");
    return;
  }
  
  console.log(`\nTop ${results.length} search results:\n`);
  
  results.forEach((result, index) => {
    if (!result.payload) return;
    
    const product = result.payload as ProductPayload;
    const score = result.score.toFixed(3);
    const price = product.price || 'N/A';
    const parsedPrice = parsePriceToNumber(price);
    
    console.log(`${index + 1}. ${product.name || 'Unknown'} (Score: ${score})`);
    console.log(`   Price: ${price}${parsedPrice ? ` (${parsedPrice})` : ''}`);
    console.log(`   Subcategory: ${product.subcategory || 'N/A'}`);
    
    if (product.mensei) {
      console.log(`   Origin: ${product.mensei}`);
    }
    
    if (product.renk) {
      console.log(`   Color: ${product.renk}`);
    }
    
    if (product.description) {
      console.log(`   Description: ${product.description.substring(0, 150)}${product.description.length > 150 ? '...' : ''}`);
    }
    
    console.log(`   URL: ${product.url || 'N/A'}`);
    console.log();
  });
}

/**
 * Run a test query with the given parameters
 * @param query The query to test
 * @param options Search options
 * @param efSearch HNSW ef_search parameter
 * @param searchMode 'approximate' or 'exact'
 * @param distanceMetric 'cosine' or 'euclid'
 */
async function runTestQuery(
  query: string,
  options: any = {},
  efSearch: number = 128,
  searchMode: string = 'approximate',
  distanceMetric: string = 'cosine'
): Promise<void> {
  try {
    console.log(`\n=== Running Test Query: "${query}" ===\n`);
    
    const startTime = Date.now();
    const result = await processQuery(query, options, efSearch, searchMode, distanceMetric);
    const endTime = Date.now();
    
    console.log(`\n=== Answer (${endTime - startTime}ms) ===\n`);
    console.log(result.answer);
    
    console.log("\n=== Search Results ===");
    displayResults(result.results);
    
  } catch (error) {
    console.error("Error running test query:", error);
  }
}

/**
 * Start an interactive session for testing the query processor
 */
async function startInteractiveSession(): Promise<void> {
  console.log("\n=== Starting Interactive Query Session ===\n");
  console.log("Enter queries to test the processor. Type 'exit' to quit.");
  console.log("You can also use special commands:");
  console.log("  !params <efSearch> <searchMode> <distanceMetric> - Change search parameters");
  console.log("  !filter <subcategory> - Add subcategory filter");
  console.log("  !price <min> <max> - Add price filter");
  console.log("  !reset - Reset all filters and parameters");
  console.log("  !help - Show this help message");
  console.log();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  let efSearch = 128;
  let searchMode = 'approximate';
  let distanceMetric = 'cosine';
  let options: any = {};
  
  const askForQuery = () => {
    rl.question("\nEnter query: ", async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log("Exiting interactive session.");
        rl.close();
        return;
      }
      
      if (input.startsWith('!')) {
        const parts = input.split(' ');
        const command = parts[0].toLowerCase();
        
        if (command === '!params') {
          if (parts.length >= 2) efSearch = parseInt(parts[1]) || efSearch;
          if (parts.length >= 3) searchMode = parts[2] || searchMode;
          if (parts.length >= 4) distanceMetric = parts[3] || distanceMetric;
          
          console.log(`Parameters updated: efSearch=${efSearch}, searchMode=${searchMode}, distanceMetric=${distanceMetric}`);
        } else if (command === '!filter') {
          if (parts.length >= 2) {
            options.subcategory = parts[1];
            console.log(`Filter updated: subcategory=${options.subcategory}`);
          }
        } else if (command === '!price') {
          if (parts.length >= 2) options.minPrice = parseInt(parts[1]) || undefined;
          if (parts.length >= 3) options.maxPrice = parseInt(parts[2]) || undefined;
          
          console.log(`Price filter updated: min=${options.minPrice || 'none'}, max=${options.maxPrice || 'none'}`);
        } else if (command === '!reset') {
          efSearch = 128;
          searchMode = 'approximate';
          distanceMetric = 'cosine';
          options = {};
          
          console.log("All parameters and filters reset to defaults.");
        } else if (command === '!help') {
          console.log("Available commands:");
          console.log("  !params <efSearch> <searchMode> <distanceMetric> - Change search parameters");
          console.log("  !filter <subcategory> - Add subcategory filter");
          console.log("  !price <min> <max> - Add price filter");
          console.log("  !reset - Reset all filters and parameters");
          console.log("  !help - Show this help message");
          console.log("  exit - Quit the interactive session");
        } else {
          console.log("Unknown command. Type !help for available commands.");
        }
      } else if (input.trim()) {
        await runTestQuery(input, options, efSearch, searchMode, distanceMetric);
      }
      
      askForQuery();
    });
  };
  
  askForQuery();
}

/**
 * Test the connection to Qdrant and get collection info
 */
async function testQdrantConnection(): Promise<boolean> {
  try {
    console.log("Testing connection to Qdrant...");
    console.log(`URL: ${qdrantUrl}`);
    
    // Get collections
    const collections = await qdrantClient.getCollections();
    console.log(`Found ${collections.collections.length} collections`);
    
    // Check if our collection exists
    const collectionExists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (!collectionExists) {
      console.error(`Collection "${COLLECTION_NAME}" does not exist!`);
      return false;
    }
    
    console.log(`Collection "${COLLECTION_NAME}" exists`);
    
    // Get collection info
    const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);
    console.log("Collection info:", JSON.stringify(collectionInfo, null, 2));
    
    // Get collection size
    const collectionSize = collectionInfo.points_count || 0;
    console.log(`Collection contains ${collectionSize} points`);
    
    if (collectionSize === 0) {
      console.warn("Collection is empty! Please run the vectorization script first.");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error connecting to Qdrant:", error);
    return false;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log("=== Product Query Processor ===");
  
  // Check if OpenAI API key is set
  if (!process.env.REACT_APP_OPENAI_API_KEY) {
    console.error("Error: REACT_APP_OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }
  
  // Check if Qdrant credentials are set
  if (!qdrantUrl || !qdrantApiKey) {
    console.error("Error: REACT_APP_QDRANT_URL and REACT_APP_QDRANT_API_KEY environment variables must be set");
    process.exit(1);
  }
  
  // Test Qdrant connection
  const connectionOk = await testQdrantConnection();
  
  if (!connectionOk) {
    console.error("Error: Could not connect to Qdrant or collection is not properly set up");
    process.exit(1);
  }
  
  console.log("\nQdrant connection successful!");
  
  // Display menu
  console.log("\nSelect an option:");
  console.log("1. Run a test query");
  console.log("2. Start interactive session");
  console.log("3. Exit");
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question("Enter option (1-3): ", async (option) => {
    switch (option) {
      case "1":
        rl.question("Enter query: ", async (query) => {
          await runTestQuery(query);
          rl.close();
        });
        break;
      case "2":
        rl.close();
        await startInteractiveSession();
        break;
      case "3":
        console.log("Exiting...");
        rl.close();
        break;
      default:
        console.log("Invalid option. Exiting...");
        rl.close();
        break;
    }
  });
}

// Run the main function
main().catch(console.error); 