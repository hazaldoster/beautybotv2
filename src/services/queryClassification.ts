import { createClient } from '@supabase/supabase-js';
// Use require for the embeddings module
const { generateEmbedding } = require('./embeddings.cjs');
import { searchSimilar } from './qdrant/qdrantService';
import { COLLECTION_NAME } from '../config/qdrant';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

/**
 * Classification modes for user queries
 */
export enum QueryMode {
  DIRECT = 'direct',
  SEMANTIC = 'semantic',
  NON_RAG = 'non_rag',
  DECLINED = 'declined'
}

/**
 * Interface for query classification result
 */
export interface QueryClassification {
  mode: QueryMode;
  sql?: string;
  semantic_type?: string;
  category?: string;
  product_id?: string;
  ef_search?: number;
  distance_metric?: string;
  search_mode?: string;
  message?: string;
}

/**
 * Call the LLM to classify or process a query
 * @param prompt The prompt to send to the LLM
 * @returns The LLM response
 */
async function llmCall(prompt: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // or another model
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error calling LLM:', error);
    throw error;
  }
}

/**
 * Classify a user query into one of four modes
 * @param query The user query
 * @returns Classification result
 */
export async function classifyQuery(query: string): Promise<QueryClassification> {
  const prompt = `Classify the following user query into one of four modes: 'direct', 'semantic', 'non_rag', or 'declined'.
If the query can be answered with a direct SQL query to our product database, choose 'direct' and provide the SQL.
If the query requires semantic search on beauty and cosmetics products, choose 'semantic' and specify semantic_type (specific_product, category, or high-level).
If the query is on beauty and cosmetics but not related to our data, or is high-level knowledge, choose 'non_rag'.
If the query is risky or unrelated to beauty/cosmetics, choose 'declined'.

Respond in JSON format with the following structure:
For direct: {"mode": "direct", "sql": "SQL_QUERY_HERE"}
For semantic: {"mode": "semantic", "semantic_type": "category", "category": "face cream", "ef_search": 50, "distance_metric": "cosine", "search_mode": "approximate"}
For non_rag: {"mode": "non_rag"}
For declined: {"mode": "declined", "message": "I'm sorry, but I cannot answer that."}

Query: ${query}`;

  try {
    const classification = await llmCall(prompt);
    return classification as QueryClassification;
  } catch (error) {
    console.error('Error classifying query:', error);
    return { mode: QueryMode.DECLINED, message: 'Sorry, I encountered an error processing your request.' };
  }
}

/**
 * Execute a direct SQL query on Supabase
 * @param sqlQuery The SQL query to execute
 * @param supabaseClient Optional Supabase client
 * @returns Query result
 */
export async function executeDirectSql(sqlQuery: string, supabaseClient: any = supabase) {
  try {
    // For demonstration purposes, we'll just execute a simple query
    // In production, you would use the execute_read_only_query function
    const { data, error } = await supabaseClient
      .from('product_inventory')
      .select()
      .limit(5);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error executing SQL query:', error);
    throw error;
  }
}

/**
 * Perform semantic search in Qdrant
 * @param query The user query
 * @param embeddingModel The embedding model to use
 * @param qdrantClient Optional Qdrant client
 * @param filters Optional filters for the search
 * @param searchParams Search parameters
 * @param topK Number of results to return
 * @returns Search results
 */
export async function semanticSearch(
  query: string,
  embeddingModel: any = null, // Not used, we use the local generateEmbedding function
  qdrantClient: any = null, // Not used, we use the local searchSimilar function
  filters: any = {},
  searchParams: any = {},
  topK: number = 5
) {
  try {
    // Generate embedding for the query
    const queryVector = await generateEmbedding(query);
    
    // Perform search in Qdrant
    const results = await searchSimilar(queryVector, topK, COLLECTION_NAME);
    
    return results;
  } catch (error) {
    console.error('Error performing semantic search:', error);
    throw error;
  }
}

/**
 * Aggregate document texts into a single context string
 * @param documents List of documents from search results
 * @returns Aggregated context
 */
export function aggregateContext(documents: any[]): string {
  const context = documents.map((doc, index) => {
    const payload = doc.payload;
    return `[Document ${index + 1}]
Product: ${payload.name || 'N/A'}
ID: ${payload.product_id || 'N/A'}
Price: ${payload.price || 'N/A'}
Category: ${payload.subcategory || 'N/A'}
Rating: ${payload.rating || 'N/A'}
URL: ${payload.url || 'N/A'}`;
  }).join('\n\n');
  
  return context;
}

/**
 * Generate a prompt based on semantic type for retrieval-augmented generation
 * @param semanticType Type of semantic query
 * @param context Context from retrieved documents
 * @param query Original user query
 * @returns Generated prompt
 */
export function generatePromptBasedOnType(semanticType: string, context: string, query: string): string {
  if (semanticType === "specific_product") {
    return `Using the detailed product data:
${context}

Answer the question: ${query}`;
  } else if (semanticType === "category") {
    return `Based on the product information for this category:
${context}

Answer the question: ${query}`;
  } else { // high-level
    return `Using comprehensive product data:
${context}

Answer the question: ${query}`;
  }
}

/**
 * Call OpenAI's LLM to generate a final answer
 * @param prompt The prompt to send to the LLM
 * @returns Generated answer
 */
export async function openaiLlmCall(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // or another model
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500
    });
    
    const answer = response.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';
    return answer;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

/**
 * Process a user query through the entire pipeline (original implementation)
 * @param query The user query
 * @returns Final answer
 */
export async function processQuery(query: string): Promise<string> {
  try {
    // Step 1: Classify the query
    const classification = await classifyQuery(query);
    
    // Step 2: Route based on classification
    switch (classification.mode) {
      case QueryMode.DIRECT:
        if (!classification.sql) {
          return "I understand this requires a direct database query, but I couldn't generate the SQL.";
        }
        
        const sqlResults = await executeDirectSql(classification.sql);
        const sqlContext = JSON.stringify(sqlResults, null, 2);
        const sqlPrompt = `Based on the following database results:
${sqlContext}

Answer the user's question: ${query}`;
        
        return await openaiLlmCall(sqlPrompt);
        
      case QueryMode.SEMANTIC:
        const searchParams: any = {};
        
        if (classification.ef_search) {
          searchParams.ef = classification.ef_search;
        }
        
        if (classification.distance_metric) {
          searchParams.metric = classification.distance_metric;
        }
        
        const filters: any = {};
        if (classification.category) {
          filters.subcategory = classification.category;
        }
        
        const searchResults = await semanticSearch(query, null, null, filters, searchParams);
        const context = aggregateContext(searchResults);
        const semanticPrompt = generatePromptBasedOnType(
          classification.semantic_type || 'high-level',
          context,
          query
        );
        
        return await openaiLlmCall(semanticPrompt);
        
      case QueryMode.NON_RAG:
        const nonRagPrompt = `Answer the following question about beauty and cosmetics without using specific product data:
${query}

Provide a helpful, informative response based on general knowledge about beauty and cosmetics.`;
        
        return await openaiLlmCall(nonRagPrompt);
        
      case QueryMode.DECLINED:
        return classification.message || "I'm sorry, but I cannot answer that question.";
        
      default:
        return "I'm not sure how to process your question. Could you rephrase it?";
    }
  } catch (error) {
    console.error('Error processing query:', error);
    return "I encountered an error while processing your question. Please try again.";
  }
}

/**
 * Process a user query through the entire pipeline (new implementation based on Python code)
 * This function simulates a Next.js API route handler
 * 
 * @param query The user query
 * @param embeddingModel Optional embedding model (not used, we use the local generateEmbedding function)
 * @param supabaseClient Optional Supabase client
 * @param qdrantClient Optional Qdrant client
 * @returns Final answer
 */
export async function processUserQuery(
  query: string,
  embeddingModel: any = null,
  supabaseClient: any = supabase,
  qdrantClient: any = null
): Promise<string> {
  try {
    // Step 1: Classify the query
    const classification = await classifyQuery(query);
    const mode = classification.mode;

    // Step 2: Route based on classification
    if (mode === QueryMode.DECLINED) {
      // Return safe guard message
      return classification.message || "I'm sorry, but I cannot answer that.";
    }
    
    else if (mode === QueryMode.DIRECT) {
      // Execute direct SQL query
      const sqlQuery = classification.sql || '';
      const data = await executeDirectSql(sqlQuery, supabaseClient);
      const prompt = `Based on the following data: ${JSON.stringify(data)}\nAnswer the question: ${query}`;
      const answer = await openaiLlmCall(prompt);
      return answer;
    }
    
    else if (mode === QueryMode.SEMANTIC) {
      // Semantic RAG processing
      const semanticType = classification.semantic_type || 'high_level';
      let filters: any = {};
      
      if (semanticType === 'specific_product') {
        filters = { product_id: classification.product_id };
      }
      else if (semanticType === 'category') {
        filters = { subcategory: classification.category };
      }
      
      // For high-level, filters may be empty
      const searchParams = {
        ef_search: classification.ef_search || 50,
        distance_metric: classification.distance_metric || 'cosine',
        search_mode: classification.search_mode || 'approximate'
      };
      
      const documents = await semanticSearch(
        query, 
        embeddingModel, 
        qdrantClient, 
        filters, 
        searchParams
      );
      
      const context = aggregateContext(documents);
      const prompt = generatePromptBasedOnType(semanticType, context, query);
      const answer = await openaiLlmCall(prompt);
      return answer;
    }
    
    else if (mode === QueryMode.NON_RAG) {
      // Direct LLM answer without retrieval
      const safeInstructions = "Answer the following question as an expert on beauty and cosmetics. " +
                              "Ensure that no risky recommendations or advice on human life is provided.";
      const prompt = `${safeInstructions}\nQuestion: ${query}`;
      const answer = await openaiLlmCall(prompt);
      return answer;
    }
    
    else {
      // Fallback safe message
      return "I'm sorry, but I cannot answer that.";
    }
  } catch (error) {
    console.error('Error processing user query:', error);
    return "I encountered an error while processing your question. Please try again.";
  }
} 