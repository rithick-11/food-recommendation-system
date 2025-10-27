const { verifyToken } = require('../utils/auth');
const User = require('../models/User');

/**
 * Middleware to authenticate user using JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Extract token from "Bearer <token>" format
    let token;
    if (authHeader.startsWith('Bearer')) {
      // Handle both "Bearer token" and "Bearer " cases
      const bearerToken = authHeader.slice(6).trim(); // Remove "Bearer" and trim
      if (!bearerToken) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Invalid token format.'
        });
      }
      token = bearerToken;
    } else {
      token = authHeader.trim();
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Invalid token format.'
        });
      }
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token expired.'
      });
    }

    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

/**
 * Middleware to authorize user based on role
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is a patient
 */
const requirePatient = authorize(['patient']);

/**
 * Middleware to check if user is a doctor
 */
const requireDoctor = authorize(['doctor']);

/**
 * Middleware to check if user is either patient or doctor
 */
const requireAuthenticated = authorize(['patient', 'doctor']);

/**
 * Middleware to check if user is an admin
 */
const requireAdmin = authorize(['admin']);

/**
 * Middleware to check if user is either patient, doctor, or admin
 */
const requireAnyRole = authorize(['patient', 'doctor', 'admin']);

/**
 * Middleware to check if doctor is approved
 */
const requireApprovedDoctor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. User not authenticated.'
    });
  }

  if (req.user.role !== 'doctor') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Doctor role required.'
    });
  }

  if (req.user.approvalStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Doctor approval pending. Please wait for admin approval.',
      code: 'DOCTOR_NOT_APPROVED',
      approvalStatus: req.user.approvalStatus
    });
  }

  next();
};

// Alias for common middleware names
const protect = authenticate;
const adminOnly = requireAdmin;

module.exports = {
  authenticate,
  authorize,
  requirePatient,
  requireDoctor,
  requireAuthenticated,
  requireAdmin,
  requireAnyRole,
  requireApprovedDoctor,
  protect,
  adminOnly
};