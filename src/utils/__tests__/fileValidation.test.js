/**
 * Tests for File Validation Utilities
 */

const {
  sanitizeFilename,
  getFileExtension,
  isImageFile,
  isPDFFile,
  validateFileSize,
  ALLOWED_FILE_TYPES
} = require('../fileValidation');

describe('File Validation Utilities', () => {
  
  describe('sanitizeFilename', () => {
    it('should remove special characters', () => {
      const result = sanitizeFilename('test@file#name$.pdf');
      expect(result).toBe('test_file_name_.pdf');
    });
    
    it('should remove path components', () => {
      const result = sanitizeFilename('../../../etc/passwd');
      expect(result).toBe('passwd');
    });
    
    it('should handle multiple dots', () => {
      const result = sanitizeFilename('file....pdf');
      expect(result).toBe('file.pdf');
    });
    
    it('should handle empty or invalid filenames', () => {
      const result = sanitizeFilename('.');
      expect(result).toMatch(/^file_\d+$/);
    });
    
    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(250) + '.pdf';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(200);
      expect(result).toMatch(/\.pdf$/);
    });
    
    it('should preserve valid filenames', () => {
      const result = sanitizeFilename('valid-file_name.pdf');
      expect(result).toBe('valid-file_name.pdf');
    });
  });
  
  describe('getFileExtension', () => {
    it('should return lowercase extension', () => {
      expect(getFileExtension('file.PDF')).toBe('.pdf');
      expect(getFileExtension('image.JPG')).toBe('.jpg');
    });
    
    it('should handle multiple dots', () => {
      expect(getFileExtension('my.file.name.pdf')).toBe('.pdf');
    });
    
    it('should return empty string for no extension', () => {
      expect(getFileExtension('noextension')).toBe('');
    });
  });
  
  describe('isImageFile', () => {
    it('should identify image files by extension', () => {
      expect(isImageFile({ originalname: 'photo.jpg' })).toBe(true);
      expect(isImageFile({ originalname: 'photo.png' })).toBe(true);
      expect(isImageFile({ originalname: 'photo.webp' })).toBe(true);
    });
    
    it('should identify image files by MIME type', () => {
      expect(isImageFile({ mimetype: 'image/jpeg', originalname: 'photo' })).toBe(true);
      expect(isImageFile({ mimetype: 'image/png', originalname: 'photo' })).toBe(true);
    });
    
    it('should reject non-image files', () => {
      expect(isImageFile({ originalname: 'document.pdf' })).toBe(false);
      expect(isImageFile({ mimetype: 'application/pdf', originalname: 'doc' })).toBe(false);
    });
    
    it('should be case-insensitive', () => {
      expect(isImageFile({ originalname: 'PHOTO.JPG' })).toBe(true);
      expect(isImageFile({ mimetype: 'IMAGE/JPEG', originalname: 'photo' })).toBe(true);
    });
  });
  
  describe('isPDFFile', () => {
    it('should identify PDF files by extension', () => {
      expect(isPDFFile({ originalname: 'document.pdf' })).toBe(true);
    });
    
    it('should identify PDF files by MIME type', () => {
      expect(isPDFFile({ mimetype: 'application/pdf', originalname: 'doc' })).toBe(true);
    });
    
    it('should reject non-PDF files', () => {
      expect(isPDFFile({ originalname: 'photo.jpg' })).toBe(false);
      expect(isPDFFile({ mimetype: 'image/jpeg', originalname: 'photo' })).toBe(false);
    });
    
    it('should be case-insensitive', () => {
      expect(isPDFFile({ originalname: 'DOCUMENT.PDF' })).toBe(true);
      expect(isPDFFile({ mimetype: 'APPLICATION/PDF', originalname: 'doc' })).toBe(true);
    });
  });
  
  describe('validateFileSize', () => {
    it('should accept files within size limits', () => {
      const file = { size: 1024 * 1024 }; // 1MB
      expect(() => validateFileSize(file, 'images')).not.toThrow();
    });
    
    it('should reject files exceeding size limits', () => {
      const file = { size: 10 * 1024 * 1024 }; // 10MB
      expect(() => validateFileSize(file, 'images')).toThrow('File too large');
    });
    
    it('should use correct limits for different file types', () => {
      const smallFile = { size: 1024 * 1024 }; // 1MB
      const mediumFile = { size: 3 * 1024 * 1024 }; // 3MB
      const largeFile = { size: 10 * 1024 * 1024 }; // 10MB
      
      // Images: max 5MB
      expect(() => validateFileSize(smallFile, 'images')).not.toThrow();
      expect(() => validateFileSize(largeFile, 'images')).toThrow();
      
      // Covers: max 2MB
      expect(() => validateFileSize(smallFile, 'covers')).not.toThrow();
      expect(() => validateFileSize(mediumFile, 'covers')).toThrow();
      
      // Documents: max 50MB
      expect(() => validateFileSize(largeFile, 'documents')).not.toThrow();
    });
    
    it('should throw error for unknown file type', () => {
      const file = { size: 1024 };
      expect(() => validateFileSize(file, 'unknown')).toThrow('Unknown file type');
    });
    
    it('should provide helpful error message with sizes', () => {
      const file = { size: 10 * 1024 * 1024 }; // 10MB
      try {
        validateFileSize(file, 'covers');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Maximum size');
        expect(error.message).toContain('Your file');
        expect(error.message).toContain('MB');
      }
    });
  });
  
  describe('ALLOWED_FILE_TYPES constant', () => {
    it('should have correct structure for all types', () => {
      expect(ALLOWED_FILE_TYPES.images).toBeDefined();
      expect(ALLOWED_FILE_TYPES.documents).toBeDefined();
      expect(ALLOWED_FILE_TYPES.covers).toBeDefined();
      
      // Check structure
      Object.values(ALLOWED_FILE_TYPES).forEach(type => {
        expect(type).toHaveProperty('mimeTypes');
        expect(type).toHaveProperty('extensions');
        expect(type).toHaveProperty('maxSize');
        expect(type).toHaveProperty('description');
        expect(Array.isArray(type.mimeTypes)).toBe(true);
        expect(Array.isArray(type.extensions)).toBe(true);
        expect(typeof type.maxSize).toBe('number');
        expect(typeof type.description).toBe('string');
      });
    });
  });
  
});
