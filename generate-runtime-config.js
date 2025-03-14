const fs = require('fs');
const path = require('path');

// Create a runtime config file with environment variables
console.log('Generating runtime config.js...');

// Get environment variables
const config = {
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

// Create the runtime config content
const configContent = `window.RUNTIME_CONFIG = ${JSON.stringify(config, null, 2)};`;

// Ensure the build directory exists
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Write the config to a file
fs.writeFileSync(path.join(buildDir, 'runtime-config.js'), configContent);

console.log('Runtime config generated successfully!');
console.log('Config values:');
Object.keys(config).forEach(key => {
  console.log(`- ${key}: ${config[key] ? 'Set' : 'Not set'}`);
}); 