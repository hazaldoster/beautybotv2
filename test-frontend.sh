#!/bin/bash

# Test Frontend Connections Script
# This script runs both test scripts to verify that the frontend connections are working

echo "=== BeautyBot Frontend Connection Tests ==="
echo "This script will run two tests to verify that the frontend connections are working"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  echo "Please create a .env file with your API credentials"
  echo "You can copy .env.example to .env and fill in your credentials"
  exit 1
fi

# Run the connection test script
echo "Running connection test script..."
npx ts-node src/scripts/test-connections.ts

echo ""
echo "Press Enter to continue to the frontend integration test..."
read

# Run the frontend integration test script
echo "Running frontend integration test script..."
npx ts-node src/scripts/test-frontend-integration.ts

echo ""
echo "=== All tests completed ===" 