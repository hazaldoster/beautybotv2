import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// Use require for the embeddings module
const { generateEmbeddingsBatch } = require('../services/embeddings.cjs');
import { createCollection, addVectors } from '../services/qdrant/qdrantService';
import { COLLECTION_NAME } from '../config/qdrant';
import { ProductInventory } from '../services/csvToSupabase';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Prepare text for embedding by combining relevant product fields
 * @param product Product data from Supabase
 * @returns Text representation of the product
 */
function prepareTextForEmbedding(product: ProductInventory): string {
  // Combine relevant fields for embedding
  const textParts = [
    product.name,
    product.description,
    product.extra_description,
    product.subcategory,
    // Add more fields as needed
  ];

  // Filter out null/undefined values and join with spaces
  return textParts.filter(Boolean).join(' ');
}

/**
 * Ensure ID is in a valid format for Qdrant (string or number)
 * @param id The ID to validate
 * @returns A valid ID for Qdrant
 */
function validateQdrantId(id: any): string | number {
  // If it's already a number, return it
  if (typeof id === 'number' && !isNaN(id) && id >= 0) {
    return id;
  }
  
  // If it's a string that can be parsed as a positive integer, return the number
  if (typeof id === 'string') {
    const numId = parseInt(id, 10);
    if (!isNaN(numId) && numId.toString() === id && numId >= 0) {
      return numId;
    }
    
    // If it's a UUID format, return the string
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return id;
    }
  }
  
  // If we can't validate the ID, generate a UUID
  return uuidv4();
}

/**
 * Fetch products from Supabase, generate embeddings, and store in Qdrant
 */
async function vectorizeSupabaseData() {
  try {
    console.log('Starting vectorization process...');

    // Create Qdrant collection if it doesn't exist or recreate it if the vector size has changed
    // Force recreation to ensure the correct vector size
    await createCollection(COLLECTION_NAME, undefined, true);

    // Fetch products from Supabase
    console.log('Fetching products from Supabase...');
    const { data: products, error } = await supabase
      .from('product_inventory')
      .select('*');

    if (error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }

    if (!products || products.length === 0) {
      console.log('No products found in Supabase.');
      return;
    }

    console.log(`Fetched ${products.length} products from Supabase.`);

    // Prepare texts for embedding
    const productTexts = products.map(prepareTextForEmbedding);
    
    // Generate embeddings in batches
    console.log('Generating embeddings...');
    const batchSize = 10; // Adjust based on rate limits
    const embeddings = await generateEmbeddingsBatch(productTexts, batchSize);
    
    console.log(`Generated ${embeddings.length} embeddings.`);

    // Prepare data for Qdrant with validated IDs
    const ids = products.map(product => validateQdrantId(product.product_id));
    const payloads = products.map(product => ({
      product_id: product.product_id,
      name: product.name,
      price: product.price,
      subcategory: product.subcategory,
      rating: product.rating,
      url: product.url,
      // Add more fields as needed for retrieval
    }));

    // Store embeddings in Qdrant
    console.log('Storing embeddings in Qdrant...');
    await addVectors(embeddings, ids, payloads);

    console.log('Vectorization process completed successfully!');
  } catch (error) {
    console.error('Error in vectorization process:', error);
  }
}

// Execute the vectorization process
vectorizeSupabaseData();

export default vectorizeSupabaseData; 