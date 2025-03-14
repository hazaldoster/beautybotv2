import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Qdrant configuration from environment variables
const QDRANT_API_KEY = process.env.REACT_APP_QDRANT_API_KEY || 'local_api_key';
const QDRANT_URL = process.env.REACT_APP_QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = process.env.REACT_APP_QDRANT_COLLECTION || 'product_inventory';
const VECTOR_SIZE = 1536; // OpenAI text-embedding-3-small embedding size

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  timeout: 10000, // Increase timeout to 10 seconds
  checkCompatibility: false, // Skip compatibility checks
});

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

    // Create collection
    console.log(`Creating collection ${COLLECTION_NAME}...`);
    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    });
    
    console.log(`Collection ${COLLECTION_NAME} created successfully with vector size ${VECTOR_SIZE}`);
    
    // Verify collection was created
    const collectionsAfter = await qdrantClient.getCollections();
    const collectionCreated = collectionsAfter.collections.some(
      collection => collection.name === COLLECTION_NAME
    );
    
    if (collectionCreated) {
      console.log(`✅ Collection ${COLLECTION_NAME} verified to exist`);
    } else {
      console.error(`❌ Collection ${COLLECTION_NAME} was not created successfully`);
    }
  } catch (error) {
    console.error('Error creating collection:', error);
  }
}

// Execute the collection creation process
createCollection(); 