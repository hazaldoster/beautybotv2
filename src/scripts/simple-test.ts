/**
 * Simple Test Script
 * 
 * This script doesn't rely on imports to check if ts-node is working correctly.
 * 
 * Usage:
 * npx ts-node src/scripts/simple-test.ts
 */

// Add an empty export to make this a module
export {};

console.log("=== Simple Test Script ===");
console.log("If you can see this message, ts-node is working correctly!");
console.log("Environment variables test:", process.env.NODE_ENV || "Not set");

// Test a simple function
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet("World"));
console.log("=== Test Complete ==="); 