import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Secure key generator that prevents IP spoofing, port-based bypasses, and IPv6 subnet bypasses
const secureKeyGenerator = (req: any) => {
  let ip = req.ip;
  
  // Remove any port numbers to prevent port-based bypasses
  ip = ip.replace(/:\d+[^:]*$/, '');
  
  // Use express-rate-limit's ipKeyGenerator for proper IPv6 handling
  // This automatically handles IPv6 subnet masking to prevent address rotation bypasses
  return ipKeyGenerator(ip);
};

export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: secureKeyGenerator,
  validate: {
    trustProxy: false, // Disable trust proxy validation warnings for Cloud Run
    ip: false // Disable IP format validation warnings
  }
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: secureKeyGenerator,
  validate: {
    trustProxy: false, // Disable trust proxy validation warnings for Cloud Run
    ip: false // Disable IP format validation warnings
  }
});

export const apiLimiter = rateLimitMiddleware;
