import { QdrantClient } from '@qdrant/js-client-rest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// Use require for the embeddings module
const { generateEmbeddingsBatch } = require('../services/embeddings.cjs');
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Qdrant configuration from environment variables
const QDRANT_API_KEY = process.env.REACT_APP_QDRANT_API_KEY || '';
const QDRANT_URL = process.env.REACT_APP_QDRANT_URL || '';
const COLLECTION_NAME = process.env.REACT_APP_QDRANT_COLLECTION || 'product_inventory';
const VECTOR_SIZE = 1536; // OpenAI text-embedding-3-small embedding size

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  timeout: 20000, // Increase timeout to 20 seconds
  checkCompatibility: false, // Skip compatibility checks
});

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Prepare text for embedding by combining relevant product fields
 * @param product Product data from Supabase
 * @returns Text representation of the product
 */
function prepareTextForEmbedding(product: any): string {
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
 * Create a new collection in Qdrant
 */
async function createCollection(): Promise<void> {
  try {
    console.log('Starting collection creation process...');
    console.log(`Qdrant URL: ${QDRANT_URL}`);
    console.log(`Collection Name: ${COLLECTION_NAME}`);
    console.log(`Vector Size: ${VECTOR_SIZE}`);

    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    console.log(`Found ${collections.collections.length} collections`);
    
    const collectionExists = collections.collections.some(
      collection => collection.name === COLLECTION_NAME
    );

    // Delete collection if it exists
    if (collectionExists) {
      console.log(`Deleting existing collection ${COLLECTION_NAME}...`);
      await qdrantClient.deleteCollection(COLLECTION_NAME);
      console.log(`Collection ${COLLECTION_NAME} deleted.`);
    }

    // Create collection with the correct format for the current client version
    console.log(`Creating collection ${COLLECTION_NAME}...`);
    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      }
    });
    
    console.log(`Collection ${COLLECTION_NAME} created successfully with vector size ${VECTOR_SIZE}`);
    
    // Verify collection was created
    const collectionsAfter = await qdrantClient.getCollections();
    const collectionCreated = collectionsAfter.collections.some(
      collection => collection.name === COLLECTION_NAME
    );
    
    if (collectionCreated) {
      console.log(`Verified collection ${COLLECTION_NAME} exists.`);
      
      // Get collection info to verify vector size
      const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);
      console.log(`Collection ${COLLECTION_NAME} info:`, collectionInfo);
    } else {
      console.error(`Failed to create collection ${COLLECTION_NAME}.`);
    }
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
}

/**
 * Add vectors to a Qdrant collection
 * @param vectors Array of vectors to add
 * @param ids Array of IDs for the vectors (can be strings or numbers)
 * @param payloads Array of payloads for the vectors
 */
async function addVectors(
  vectors: number[][],
  ids: (string | number)[],
  payloads: any[]
): Promise<void> {
  try {
    if (vectors.length !== ids.length || vectors.length !== payloads.length) {
      throw new Error('Vectors, IDs, and payloads must have the same length');
    }

    // Prepare points for insertion
    const points = vectors.map((vector, index) => ({
      id: ids[index],
      vector,
      payload: payloads[index],
    }));

    // Insert points in batches of 100
    const batchSize = 100;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await qdrantClient.upsert(COLLECTION_NAME, {
        points: batch,
      });
      console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(points.length / batchSize)} inserted successfully`);
    }

    console.log(`${vectors.length} vectors added to collection ${COLLECTION_NAME}`);
  } catch (error) {
    console.error('Error adding vectors:', error);
    throw error;
  }
}

/**
 * Fetch products from Supabase, generate embeddings, and store in Qdrant
 */
async function uploadToQdrant() {
  try {
    console.log('Starting vectorization process...');

    // Create Qdrant collection
    await createCollection();

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

// Run the upload function
uploadToQdrant().then(() => {
  console.log('Upload to Qdrant completed.');
}).catch(error => {
  console.error('Error in upload process:', error);
}); 