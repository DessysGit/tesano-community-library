/**
 * Tests for Authentication Middleware
 */

const { isAuthenticated, isAdmin, isSeedAdmin } = require('../auth');

// Suppress console.log during tests
const originalLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalLog;
});

describe('Authentication Middleware', () => {
  
  describe('isAuthenticated', () => {
    it('should call next() if user is authenticated', async () => {
      const req = {
        isAuthenticated: () => true,
        headers: {}
      };
      const res = {};
      const next = jest.fn();
      
      await isAuthenticated(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should return 401 if user is not authenticated', async () => {
      const req = {
        isAuthenticated: () => false,
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      const next = jest.fn();
      
      await isAuthenticated(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('You must be logged in to perform this action.');
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('isAdmin', () => {
    it('should call next() if user is authenticated and is admin', async () => {
      const req = {
        isAuthenticated: () => true,
        user: { role: 'admin' },
        headers: {}
      };
      const res = {};
      const next = jest.fn();
      
      await isAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should return 403 if user is not admin', async () => {
      const req = {
        isAuthenticated: () => true,
        user: { role: 'user' },
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      const next = jest.fn();
      
      await isAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Only admin can perform this action.');
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 403 if user is not authenticated', async () => {
      const req = {
        isAuthenticated: () => false,
        user: null,
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      const next = jest.fn();
      
      await isAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('isSeedAdmin', () => {
    // We need to test with the actual ADMIN_USERNAME from environment
    // For testing, we'll use 'admin' which is the default
    
    it('should call next() if user is the seed admin', async () => {
      const req = {
        isAuthenticated: () => true,
        user: { username: 'admin' }, // Using actual default admin username
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      const next = jest.fn();
      
      await isSeedAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should return 403 if user is not the seed admin', async () => {
      const req = {
        isAuthenticated: () => true,
        user: { username: 'otheradmin' },
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      const next = jest.fn();
      
      await isSeedAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Only the seeded admin can perform this action.');
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 401 if user is not authenticated', async () => {
      const req = {
        isAuthenticated: () => false,
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      const next = jest.fn();
      
      await isSeedAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('Authentication required.');
      expect(next).not.toHaveBeenCalled();
    });
  });
  
});