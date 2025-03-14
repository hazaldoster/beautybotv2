import { qdrantClient, COLLECTION_NAME } from '../../config/qdrant';
import { VECTOR_SIZE } from '../../services/embeddings';

/**
 * Create a new collection in Qdrant if it doesn't exist or recreate it if the vector size has changed
 * @param collectionName Name of the collection to create
 * @param vectorSize Dimension of the vectors
 * @param forceRecreate Whether to force recreation of the collection
 */
export async function createCollection(
  collectionName: string = COLLECTION_NAME,
  vectorSize: number = VECTOR_SIZE,
  forceRecreate: boolean = false
): Promise<void> {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    let collectionExists = collections.collections.some(
      collection => collection.name === collectionName
    );

    // If collection exists and we need to check its vector size
    if (collectionExists && !forceRecreate) {
      try {
        // Get collection info to check vector size
        const collectionInfo = await qdrantClient.getCollection(collectionName);
        const existingVectorSize = collectionInfo.config?.params?.vectors?.size;
        
        console.log(`Collection ${collectionName} exists with vector size: ${existingVectorSize}`);
        
        // If vector size has changed, we need to recreate the collection
        if (existingVectorSize !== vectorSize) {
          console.log(`Vector size has changed from ${existingVectorSize} to ${vectorSize}. Recreating collection...`);
          forceRecreate = true;
        }
      } catch (error) {
        console.error('Error getting collection info:', error);
      }
    }

    // Delete collection if it exists and we need to recreate it
    if (collectionExists && forceRecreate) {
      console.log(`Deleting existing collection ${collectionName}...`);
      await qdrantClient.deleteCollection(collectionName);
      console.log(`Collection ${collectionName} deleted.`);
      collectionExists = false;
    }

    // Create collection if it doesn't exist or was deleted
    if (!collectionExists) {
      // Create collection configuration
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });
      console.log(`Collection ${collectionName} created successfully with vector size ${vectorSize}`);
    } else {
      console.log(`Using existing collection ${collectionName}`);
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
 * @param collectionName Name of the collection to add vectors to
 */
export async function addVectors(
  vectors: number[][],
  ids: (string | number)[],
  payloads: any[],
  collectionName: string = COLLECTION_NAME
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
      await qdrantClient.upsert(collectionName, {
        points: batch,
      });
      console.log(`Batch ${Math.floor(i / batchSize) + 1} inserted successfully`);
    }

    console.log(`${vectors.length} vectors added to collection ${collectionName}`);
  } catch (error) {
    console.error('Error adding vectors:', error);
    throw error;
  }
}

/**
 * Search for similar vectors in a Qdrant collection
 * @param vector Vector to search for
 * @param limit Maximum number of results to return
 * @param collectionName Name of the collection to search in
 * @returns Array of search results
 */
export async function searchSimilar(
  vector: number[],
  limit: number = 10,
  collectionName: string = COLLECTION_NAME
): Promise<any[]> {
  try {
    const searchResult = await qdrantClient.search(collectionName, {
      vector,
      limit,
      with_payload: true,
    });

    return searchResult;
  } catch (error) {
    console.error('Error searching for similar vectors:', error);
    throw error;
  }
} 