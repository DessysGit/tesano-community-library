/**
 * Jest Setup File
 * 
 * This runs before all tests to configure the test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Increase test timeout for async operations
jest.setTimeout(10000);

// Suppress console output during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Clean up after all tests
afterAll(async () => {
  // Close any open database connections
  try {
    const { closePool } = require('../src/config/database');
    await closePool();
  } catch (error) {
    // Ignore if database module doesn't exist
  }
  
  // Give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
});
