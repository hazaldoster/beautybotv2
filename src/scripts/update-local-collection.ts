import { QdrantClient } from '@qdrant/js-client-rest';

// Qdrant configuration for local instance
const QDRANT_API_KEY = 'local_api_key';
const QDRANT_URL = 'http://localhost:6333'; // Local Docker container
const COLLECTION_NAME = 'product_inventory';
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
async function updateLocalCollection(): Promise<void> {
  try {
    console.log('Starting local collection update process...');
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
      console.log(`Verified collection ${COLLECTION_NAME} exists.`);
      
      // Get collection info to verify vector size
      const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);
      const vectorSize = collectionInfo.config?.params?.vectors?.size;
      
      console.log(`Collection ${COLLECTION_NAME} has vector size: ${vectorSize}`);
    } else {
      console.error(`Failed to create collection ${COLLECTION_NAME}.`);
    }
  } catch (error) {
    console.error('Error updating local collection:', error);
  }
}

// Run the update function
updateLocalCollection().then(() => {
  console.log('Local collection update process completed.');
}).catch(error => {
  console.error('Error in update process:', error);
}); 