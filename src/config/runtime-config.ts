// Define the type for our runtime configuration
interface RuntimeConfig {
  REACT_APP_OPENAI_API_KEY: string;
  OPENAI_API_KEY: string;
  REACT_APP_ASSISTANT_ID: string;
  REACT_APP_QDRANT_URL: string;
  REACT_APP_QDRANT_API_KEY: string;
  REACT_APP_QDRANT_COLLECTION: string;
  REACT_APP_PROXY_URL: string;
  REACT_APP_SUPABASE_URL: string;
  REACT_APP_SUPABASE_ANON_KEY: string;
}

// Declare the global window property
declare global {
  interface Window {
    RUNTIME_CONFIG?: RuntimeConfig;
  }
}

// Get the runtime config from the window object
const getRuntimeConfig = (): RuntimeConfig => {
  // Use the runtime config if available
  if (window.RUNTIME_CONFIG) {
    return window.RUNTIME_CONFIG;
  }
  
  // Fallback to environment variables (for development)
  return {
    REACT_APP_OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    REACT_APP_ASSISTANT_ID: process.env.REACT_APP_ASSISTANT_ID || '',
    REACT_APP_QDRANT_URL: process.env.REACT_APP_QDRANT_URL || '',
    REACT_APP_QDRANT_API_KEY: process.env.REACT_APP_QDRANT_API_KEY || '',
    REACT_APP_QDRANT_COLLECTION: process.env.REACT_APP_QDRANT_COLLECTION || 'product_inventory',
    REACT_APP_PROXY_URL: process.env.REACT_APP_PROXY_URL || '',
    REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL || '',
    REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY || ''
  };
};

// Export the config
export const runtimeConfig = getRuntimeConfig();

// Helper functions to get specific values
export const getOpenAIApiKey = (): string => runtimeConfig.REACT_APP_OPENAI_API_KEY || runtimeConfig.OPENAI_API_KEY || '';
export const getAssistantId = (): string => runtimeConfig.REACT_APP_ASSISTANT_ID || '';
export const getQdrantUrl = (): string => runtimeConfig.REACT_APP_PROXY_URL || runtimeConfig.REACT_APP_QDRANT_URL || '';
export const getQdrantApiKey = (): string => runtimeConfig.REACT_APP_QDRANT_API_KEY || '';
export const getQdrantCollection = (): string => runtimeConfig.REACT_APP_QDRANT_COLLECTION || 'product_inventory';
export const getSupabaseUrl = (): string => runtimeConfig.REACT_APP_SUPABASE_URL || '';
export const getSupabaseAnonKey = (): string => runtimeConfig.REACT_APP_SUPABASE_ANON_KEY || '';

// Export a function to check if all required credentials are available
export const hasRequiredCredentials = (): boolean => {
  const hasOpenAI = !!getOpenAIApiKey();
  const hasAssistant = !!getAssistantId();
  
  // Log what's missing
  if (!hasOpenAI) {
    console.error('Missing OpenAI API key');
  }
  if (!hasAssistant) {
    console.error('Missing Assistant ID');
  }
  
  return hasOpenAI && hasAssistant;
}; 