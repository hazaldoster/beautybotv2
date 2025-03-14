# Supabase to Qdrant Vectorization System

This system allows you to vectorize data stored in Supabase and store the vectorized version in Qdrant for semantic search and recommendations.

## Overview

The system performs the following steps:
1. Fetches product data from Supabase
2. Generates embeddings for each product using the OpenAI text-embedding-3-small model
3. Stores the embeddings in Qdrant along with relevant product metadata
4. Provides search and recommendation functionality using the vectorized data
5. Intelligently classifies and routes user queries to the appropriate processing pipeline

## Embedding Model

This system uses the **OpenAI text-embedding-3-small** model for generating embeddings. This model:
- Produces 1536-dimensional embeddings
- Is optimized for semantic similarity tasks
- Provides high-quality embeddings for search and recommendations
- Requires an OpenAI API key

## Configuration

The system uses the following configuration files:
- `.env`: Contains environment variables for Supabase, Qdrant, and OpenAI
- `src/config/qdrant.ts`: Contains configuration for Qdrant
- `src/services/embeddings.ts`: Contains configuration for the embedding model

### Environment Variables

Make sure your `.env` file contains the following variables:
```
# Supabase credentials
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Qdrant credentials
REACT_APP_QDRANT_API_KEY=your_qdrant_api_key
REACT_APP_QDRANT_URL=your_qdrant_url
REACT_APP_QDRANT_COLLECTION=your_collection_name

# OpenAI credentials (for embeddings, query classification, and LLM responses)
REACT_APP_OPENAI_API_KEY=your_openai_api_key
```

### Qdrant Configuration

The Qdrant configuration is stored in `src/config/qdrant.ts`. It includes:
- API key (read from environment variables)
- Endpoint URL (read from environment variables)
- Vector size (1536 for OpenAI text-embedding-3-small)

## Running the Vectorization Process

To run the vectorization process, use the following command:

```bash
node vectorize.js
```

This will:
1. Create a collection in Qdrant if it doesn't exist
2. Fetch all products from Supabase
3. Generate embeddings for each product
4. Store the embeddings in Qdrant

## Query Classification & Routing

The system includes an intelligent query classification and routing system that:

1. Analyzes user queries using an LLM
2. Classifies them into one of four modes:
   - **Direct**: Answerable via direct SQL queries to Supabase
   - **Semantic**: Requires semantic search using Qdrant
   - **Non-RAG**: Answerable directly by the LLM without retrieval
   - **Declined**: Queries that should be declined (risky or out-of-domain)
3. Routes the query to the appropriate processing pipeline
4. Generates a final response

### Using the Query Classification System

```typescript
import { processQuery } from './src/services/queryClassification';

// Process a user query
const query = "What are the best makeup products under 100 TL?";
const answer = await processQuery(query);
console.log(answer);
```

### Supabase Setup for Direct SQL Queries

For direct SQL queries to work, you need to create a stored procedure in Supabase:

1. Navigate to the SQL Editor in your Supabase dashboard
2. Run the SQL script in `src/scripts/create_execute_read_only_query.sql`
3. This creates a secure function that only allows read-only queries

## Testing the System

The system includes a unified testing script that can run various tests:

```bash
node test.js [test1] [test2] ...
```

Available tests:
- `embedding` - Test the embedding model
- `openai` - Test the OpenAI API key
- `search` - Test the search functionality
- `query` - Test the query classification and routing
- `all` - Run all tests

Examples:

```bash
# Test just the embedding model
node test.js embedding

# Test the search functionality
node test.js search

# Test the query classification system
node test.js query

# Run all tests
node test.js all
```

## Using the Search and Recommendation Functions

The system provides several functions for searching and recommendations:

### Search Similar Products

```typescript
import { searchSimilarProducts } from './src/services/qdrant/productSearch';

// Search for products similar to a query
const results = await searchSimilarProducts('comfortable red shoes', 5);
```

### Search Products by Category

```typescript
import { searchProductsByCategory } from './src/services/qdrant/productSearch';

// Search for products in a category
const results = await searchProductsByCategory('electronics', 10);
```

### Get Product Recommendations

```typescript
import { getProductRecommendations } from './src/services/qdrant/productSearch';

// Get recommendations based on a product ID
const recommendations = await getProductRecommendations('product123', 5);
```

## Troubleshooting

If you encounter issues:

1. Check that your environment variables are correctly set
2. Ensure that the Qdrant endpoint is accessible
3. Run the test script to verify the embedding model is working
4. Check the Supabase connection and table structure
5. Verify that the OpenAI API key is valid for query classification

## Dependencies

- `@supabase/supabase-js`: For interacting with Supabase
- `@qdrant/js-client-rest`: For interacting with Qdrant
- `openai`: For generating embeddings, query classification, and LLM responses
- `dotenv`: For loading environment variables
- `ts-node`: For running TypeScript files directly 