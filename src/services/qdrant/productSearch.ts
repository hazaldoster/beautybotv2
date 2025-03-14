// Use require for the embeddings module
const { generateEmbedding } = require('../embeddings.cjs');
import { searchSimilar } from './qdrantService';
import { COLLECTION_NAME } from '../../config/qdrant';
import { qdrantClient } from '../../config/qdrant';

/**
 * Search for similar products based on a query text
 * @param queryText Text to search for
 * @param limit Maximum number of results to return
 * @returns Array of similar products with their similarity scores
 */
export async function searchSimilarProducts(
  queryText: string,
  limit: number = 10
): Promise<any[]> {
  try {
    // Generate embedding for the query text
    const queryEmbedding = await generateEmbedding(queryText);
    
    // Search for similar products in Qdrant
    const searchResults = await searchSimilar(queryEmbedding, limit);
    
    return searchResults;
  } catch (error) {
    console.error('Error searching for similar products:', error);
    throw error;
  }
}

/**
 * Search for products by category
 * @param category Category to search for
 * @param limit Maximum number of results to return
 * @returns Array of products in the specified category
 */
export async function searchProductsByCategory(
  category: string,
  limit: number = 10
): Promise<any[]> {
  try {
    // Generate embedding for the category
    const categoryEmbedding = await generateEmbedding(category);
    
    // Search for products in the specified category
    const searchResults = await searchSimilar(categoryEmbedding, limit);
    
    return searchResults;
  } catch (error) {
    console.error('Error searching for products by category:', error);
    throw error;
  }
}

/**
 * Get product recommendations based on a product ID
 * @param productId ID of the product to get recommendations for
 * @param limit Maximum number of recommendations to return
 * @returns Array of recommended products
 */
export async function getProductRecommendations(
  productId: string,
  limit: number = 5
): Promise<any[]> {
  try {
    // Get the product vector by ID
    const response = await qdrantClient.retrieve(COLLECTION_NAME, {
      ids: [productId],
      with_vector: true,
    });
    
    if (!response || response.length === 0) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    // Get the product's vector
    const productVector = response[0].vector;
    
    // Check if the vector is valid
    if (!productVector || !Array.isArray(productVector)) {
      throw new Error(`Product with ID ${productId} has no valid vector`);
    }
    
    // Search for similar products
    const recommendationResults = await searchSimilar(productVector as number[], limit + 1);
    
    // Remove the original product from the results
    return recommendationResults.filter(result => result.id !== productId);
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    throw error;
  }
} 