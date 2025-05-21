import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      logger.warn('Authentication attempt without token', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      logger.warn('Authentication attempt with non-existent user', {
        userId: decoded.userId,
        path: req.path,
        method: req.method
      });
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add user to request
    req.user = user;
    logger.info('User authenticated successfully', {
      userId: user.id,
      role: user.role,
      path: req.path,
      method: req.method
    });
    next();
  } catch (error) {
    logger.error('Authentication error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// Admin authorization middleware
export const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    logger.warn('Admin authorization failed', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
      method: req.method
    });
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  logger.info('Admin authorization successful', {
    userId: req.user.id,
    path: req.path,
    method: req.method
  });
  next();
};

// Client authorization middleware
export const authorizeClient = (req, res, next) => {
  if (req.user.role !== 'client') {
    logger.warn('Client authorization failed', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
      method: req.method
    });
    return res.status(403).json({
      success: false,
      message: 'Access denied. Client privileges required.'
    });
  }
  logger.info('Client authorization successful', {
    userId: req.user.id,
    path: req.path,
    method: req.method
  });
  next();
};

// Optional authentication middleware
export const optionalAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      req.user = null;
      logger.debug('Optional auth: No token provided', {
        path: req.path,
        method: req.method
      });
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId }
    });

    // Add user to request
    req.user = user;
    if (user) {
      logger.debug('Optional auth: User authenticated', {
        userId: user.id,
        role: user.role,
        path: req.path,
        method: req.method
      });
    }
    next();
  } catch (error) {
    logger.warn('Optional auth error:', {
      error: error.message,
      path: req.path,
      method: req.method
    });
    req.user = null;
    next();
  }
}; 