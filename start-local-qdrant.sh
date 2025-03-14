#!/bin/bash

# Create storage directory if it doesn't exist
mkdir -p qdrant_storage

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Start Qdrant using Docker Compose
echo "Starting local Qdrant instance with CORS enabled..."
docker-compose up -d

# Wait for Qdrant to be ready
echo "Waiting for Qdrant to be ready..."
until $(curl --output /dev/null --silent --head --fail http://localhost:6333/healthz); do
  printf '.'
  sleep 2
done
echo "Qdrant is ready!"

# Create a temporary .env.local file with local Qdrant settings
echo "Creating .env.local with local Qdrant settings..."
cat > .env.local << EOL
# Local Qdrant settings
REACT_APP_QDRANT_URL=http://localhost:6333
REACT_APP_QDRANT_API_KEY=local_api_key
REACT_APP_QDRANT_COLLECTION=product_inventory
EOL

echo "Local Qdrant is running at http://localhost:6333"
echo "To use the local Qdrant instance, run your app with:"
echo "  npm run dev -- --env-file=.env.local"
echo ""
echo "To stop the local Qdrant instance, run:"
echo "  docker-compose down" 