#!/bin/bash

# Run tests with the correct ts-node configuration
npx ts-node --project tsconfig.node.json -r dotenv/config src/scripts/tests.ts "$@" 