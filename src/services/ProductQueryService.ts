import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAI } from "openai";

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
    console.log(`ProductQueryService: Initializing with Qdrant URL: ${config.qdrantUrl}`);
    
    // Initialize Qdrant client
    this.qdrantClient = new QdrantClient({
      url: config.qdrantUrl,
      apiKey: config.qdrantApiKey,
      timeout: 10000, // Increase timeout for reliability
      checkCompatibility: false // Skip compatibility checks
    });

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
      dangerouslyAllowBrowser: true
    });

    // Set collection name
    this.collectionName = config.collectionName;
  }

  /**
   * Parse price string to number
   * Handles formats like "175 TL", "1.990 TL", "299,99 TL"
   */
  private parsePriceToNumber(priceStr: string | undefined): number | null {
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
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use OpenAI embeddings API
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
      });
      
      // Return the embedding
      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  /**
   * Build Qdrant filter based on options
   */
  private buildQdrantFilter(options: any): any {
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
   */
  private async semanticSearch(
    query: string,
    filter: any = {},
    efSearch: number = 128,
    searchMode: string = 'approximate',
    distanceMetric: string = 'cosine',
    topK: number = 5
  ): Promise<any[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
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
      const searchResults = await this.qdrantClient.search(this.collectionName, searchParams);
      
      return searchResults;
    } catch (error) {
      console.error("Error performing semantic search:", error);
      throw error;
    }
  }

  /**
   * Post-process search results to apply price filtering
   */
  private applyPriceFilter(results: any[], minPrice?: number, maxPrice?: number): any[] {
    if (!minPrice && !maxPrice) {
      return results;
    }
    
    return results.filter(result => {
      if (!result.payload) return false;
      
      const payload = result.payload as ProductPayload;
      const price = this.parsePriceToNumber(payload.price);
      if (!price) return false;
      
      if (minPrice && price < minPrice) return false;
      if (maxPrice && price > maxPrice) return false;
      
      return true;
    });
  }

  /**
   * Aggregates product information into a context string
   */
  private aggregateContext(documents: any[]): string {
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
   */
  private generatePrompt(query: string, context: string): string {
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
   */
  private async openaiLlmCall(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
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
   * @returns Object containing the answer and search results
   */
  public async processQuery(
    query: string,
    options: any = {}
  ): Promise<{ answer: string; results: any[] }> {
    try {
      // Build filter
      const filter = this.buildQdrantFilter(options);
      
      // Perform semantic search
      const searchResults = await this.semanticSearch(
        query,
        filter,
        128, // efSearch
        'approximate', // searchMode
        'cosine', // distanceMetric
        10 // Get more results to allow for post-filtering
      );
      
      // Apply price filtering if needed
      const filteredResults = this.applyPriceFilter(
        searchResults,
        options.minPrice,
        options.maxPrice
      );
      
      // Take top 5 results after filtering
      const topResults = filteredResults.slice(0, 5);
      
      // Aggregate context
      const context = this.aggregateContext(topResults);
      
      // Generate prompt
      const prompt = this.generatePrompt(query, context);
      
      // Call LLM
      const answer = await this.openaiLlmCall(prompt);
      
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
   * Test the connection to Qdrant
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Get collections using the client's API
      const collections = await this.qdrantClient.getCollections();
      
      // Check if our collection exists
      const collectionExists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!collectionExists) {
        console.error(`Collection "${this.collectionName}" does not exist!`);
        return false;
      }
      
      // Get collection info
      const collectionInfo = await this.qdrantClient.getCollection(this.collectionName);
      
      // Get collection size
      const collectionSize = collectionInfo.points_count || 0;
      
      if (collectionSize === 0) {
        console.warn("Collection is empty! Please run the vectorization script first.");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error connecting to Qdrant:", error);
      
      // Provide more specific error message for common issues
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error("Network error: This may be due to CORS restrictions or the Qdrant server being unreachable.");
        console.error("If running locally, consider using a CORS proxy or configuring your Qdrant server to allow CORS.");
      }
      
      return false;
    }
  }
}

export default ProductQueryService; 