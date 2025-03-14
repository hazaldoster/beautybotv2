#!/bin/bash

# Function to check if Docker is running
check_docker() {
  if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running or not accessible."
    echo "Please start Docker and try again."
    exit 1
  fi
}

# Function to handle errors
handle_error() {
  echo "Error: $1"
  echo "Troubleshooting tips:"
  echo "1. Check your Docker installation and ensure it's running"
  echo "2. Try logging in to Docker with 'docker login' if you're having authentication issues"
  echo "3. Check your internet connection"
  echo "4. Try pulling the Qdrant image manually: docker pull qdrant/qdrant:v1.7.4"
  exit 1
}

# Check if Docker is running
check_docker

# Create necessary directories for Qdrant
echo "Creating necessary directories..."
mkdir -p qdrant_storage
mkdir -p qdrant_snapshots

# Pull the Qdrant image explicitly first
echo "Pulling Qdrant image..."
docker pull qdrant/qdrant:v1.7.4 || handle_error "Failed to pull Qdrant image. This could be due to Docker authentication issues or network problems."

# Stop and remove existing containers
echo "Stopping any existing containers..."
docker-compose down

# Force rebuild of containers
echo "Building containers..."
docker-compose build --no-cache || handle_error "Failed to build Docker containers"

# Start Docker containers
echo "Starting BeautyBot Docker containers..."
docker-compose up -d || handle_error "Failed to start Docker containers"

# Wait for services to start
echo "Waiting for services to start..."
sleep 15  # Increased wait time to ensure services have time to start

# Check if Qdrant is healthy
echo "Checking Qdrant health..."
for i in {1..5}; do
  if curl -s http://localhost:6333/healthz > /dev/null; then
    echo "Qdrant is healthy!"
    break
  else
    echo "Waiting for Qdrant to become healthy (attempt $i/5)..."
    sleep 5
  fi
  
  if [ $i -eq 5 ]; then
    echo "Warning: Qdrant health check failed after 5 attempts. The service might still be starting."
  fi
done

# Check if CORS proxy is healthy
echo "Checking CORS proxy health..."
for i in {1..5}; do
  if curl -s http://localhost:3001/health > /dev/null; then
    echo "CORS proxy is healthy!"
    break
  else
    echo "Waiting for CORS proxy to become healthy (attempt $i/5)..."
    sleep 5
  fi
  
  if [ $i -eq 5 ]; then
    echo "Warning: CORS proxy health check failed after 5 attempts."
    echo "Checking CORS proxy logs:"
    docker-compose logs cors-proxy
  fi
done

# Check if containers are running
echo "Checking container status..."
if [ "$(docker-compose ps -q qdrant)" ]; then
  echo "Qdrant container is running."
else
  echo "Warning: Qdrant container is not running. Check the logs with 'docker-compose logs qdrant'."
fi

if [ "$(docker-compose ps -q cors-proxy)" ]; then
  echo "CORS proxy container is running."
else
  echo "Warning: CORS proxy container is not running. Check the logs with 'docker-compose logs cors-proxy'."
fi

if [ "$(docker-compose ps -q app)" ]; then
  echo "App container is running."
else
  echo "Warning: App container is not running. Check the logs with 'docker-compose logs app'."
fi

# Display container status
echo "Container status:"
docker-compose ps

echo ""
echo "BeautyBot is now running!"
echo "- Main application: http://localhost:3002"
echo "- CORS Proxy: http://localhost:3001"
echo "- Qdrant API: http://localhost:6333"
echo "- Qdrant UI: http://localhost:6333/dashboard"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To view Qdrant logs: docker-compose logs -f qdrant"
echo "To view CORS proxy logs: docker-compose logs -f cors-proxy"
echo "To view app logs: docker-compose logs -f app"
echo "To stop: docker-compose down"

# Provide debugging tips
echo ""
echo "Debugging tips:"
echo "- If you encounter CORS issues, check the CORS proxy logs"
echo "- To test the CORS proxy: curl http://localhost:3001/health"
echo "- To check request headers: curl http://localhost:3001/debug-headers"
echo "- To check Qdrant directly: curl http://localhost:6333/collections"
echo "- If you have Docker authentication issues, try 'docker login'" 