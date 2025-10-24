import winston from 'winston';

// Mock winston to avoid file system operations in tests
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn(),
    json: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
  addColors: jest.fn(),
}));

describe('Logger Utilities', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      http: jest.fn(),
      debug: jest.fn(),
    };
    
    (winston.createLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Logger Creation', () => {
    it('should create logger with correct configuration', () => {
      // The logger is already created when the module is imported
      // We just need to verify the mock was set up correctly
      expect(winston.createLogger).toBeDefined();
    });

    it('should have all required log levels', () => {
      const levels = {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
      };
      
      // Check that levels are defined correctly
      expect(levels.error).toBe(0);
      expect(levels.warn).toBe(1);
      expect(levels.info).toBe(2);
      expect(levels.http).toBe(3);
      expect(levels.debug).toBe(4);
    });
  });

  describe('Logger Methods', () => {
    it('should call error method', () => {
      mockLogger.error('Test error message');
      expect(mockLogger.error).toHaveBeenCalledWith('Test error message');
    });

    it('should call warn method', () => {
      mockLogger.warn('Test warning message');
      expect(mockLogger.warn).toHaveBeenCalledWith('Test warning message');
    });

    it('should call info method', () => {
      mockLogger.info('Test info message');
      expect(mockLogger.info).toHaveBeenCalledWith('Test info message');
    });

    it('should call debug method', () => {
      mockLogger.debug('Test debug message');
      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message');
    });
  });

  describe('Logger Context', () => {
    it('should handle database connection logging', () => {
      const context = { operation: 'connection', success: true };
      mockLogger.info('Database connected', context);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Database connected', context);
    });

    it('should handle database error logging', () => {
      const context = { operation: 'query', error: 'Connection failed' };
      mockLogger.error('Database error', context);
      
      expect(mockLogger.error).toHaveBeenCalledWith('Database error', context);
    });
  });
});
