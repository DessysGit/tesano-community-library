/**
 * Test Helpers
 * 
 * Common utilities for testing
 */

/**
 * Create a mock request object
 */
function mockRequest(options = {}) {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    isAuthenticated: options.isAuthenticated || (() => false),
    ...options
  };
}

/**
 * Create a mock response object
 */
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Create a mock next function
 */
function mockNext() {
  return jest.fn();
}

/**
 * Create a mock Express app for testing
 */
function createMockApp() {
  return {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn()
  };
}

/**
 * Create a mock file object (for multer)
 */
function mockFile(options = {}) {
  return {
    fieldname: options.fieldname || 'file',
    originalname: options.originalname || 'test.pdf',
    encoding: options.encoding || '7bit',
    mimetype: options.mimetype || 'application/pdf',
    buffer: options.buffer || Buffer.from('test data'),
    size: options.size || 1024,
    ...options
  };
}

/**
 * Create a mock user object
 */
function mockUser(role = 'user') {
  return {
    id: 1,
    username: `test${role}`,
    email: `test${role}@example.com`,
    role: role,
    verified: true,
    created_at: new Date()
  };
}

/**
 * Create a mock admin user
 */
function mockAdmin() {
  return mockUser('admin');
}

/**
 * Sleep for testing async operations
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  mockRequest,
  mockResponse,
  mockNext,
  createMockApp,
  mockFile,
  mockUser,
  mockAdmin,
  sleep
};
