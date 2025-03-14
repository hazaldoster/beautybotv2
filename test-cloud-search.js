const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function searchProducts() {
  try {
    // Get Qdrant configuration from environment
    const qdrantUrl = process.env.REACT_APP_QDRANT_URL;
    const qdrantApiKey = process.env.REACT_APP_QDRANT_API_KEY;
    const collectionName = process.env.REACT_APP_QDRANT_COLLECTION || 'product_inventory';
    const openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is required. Please set REACT_APP_OPENAI_API_KEY in your .env file.');
    }
    
    console.log(`Using Qdrant URL: ${qdrantUrl}`);
    console.log(`Collection: ${collectionName}`);
    
    // Initialize Qdrant client
    const client = new QdrantClient({ 
      url: qdrantUrl, 
      apiKey: qdrantApiKey,
      checkCompatibility: false 
    });
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    
    // First, check collection info
    console.log('Checking collection info...');
    const collectionInfo = await client.getCollection(collectionName);
    console.log(`Collection status: ${collectionInfo.status}`);
    console.log(`Vectors count: ${collectionInfo.vectors_count}`);
    console.log(`Points count: ${collectionInfo.points_count}`);
    
    // Get subcategory distribution
    console.log('\nChecking subcategory distribution...');
    const { points } = await client.scroll(collectionName, {
      limit: 1000,
      with_payload: { include: ['subcategory'] },
      with_vectors: false
    });
    
    const subcategories = {};
    points.forEach(point => {
      const subcat = point.payload.subcategory || 'undefined';
      subcategories[subcat] = (subcategories[subcat] || 0) + 1;
    });
    
    console.log('Subcategory distribution:');
    Object.entries(subcategories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([subcat, count]) => {
        console.log(`- ${subcat}: ${count} products`);
      });
    
    // Test search queries
    const searchQueries = [
      'brown eyebrow mascara',
      'eyelash perming kit',
      'dark brown eyebrow gel'
    ];
    
    for (const searchQuery of searchQueries) {
      // Generate embedding for search query using OpenAI
      console.log(`\nGenerating embedding for query: '${searchQuery}'`);
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: searchQuery,
        encoding_format: "float",
      });
      const embedding = response.data[0].embedding;
      
      // Search for similar products
      console.log(`Searching for: '${searchQuery}'`);
      const searchResult = await client.search(collectionName, {
        vector: embedding,
        limit: 3,
        with_payload: true,
      });
      
      console.log(`Top 3 results for '${searchQuery}':`);
      searchResult.forEach((item, index) => {
        console.log(`${index + 1}. ${item.payload.name} (Score: ${item.score.toFixed(4)})`);
        console.log(`   Subcategory: ${item.payload.subcategory}`);
        console.log(`   Price: ${item.payload.price}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

searchProducts(); 