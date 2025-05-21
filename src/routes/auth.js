import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get authenticated user
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      }
    });

    if (!user) {
      logger.warn('User not found during profile fetch', { userId });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info('User profile fetched successfully', { userId });
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user profile:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email });
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.users.create({
      data: {
        name,
        email,
        password_hash
      }
    });

    // Create token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    logger.info('New user registered successfully', { 
      userId: user.id,
      email: user.email,
      name: user.name
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    logger.error('Registration error:', { 
      error: error.message, 
      stack: error.stack,
      attemptedEmail: req.body.email
    });
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logger.warn('Login attempt with invalid password', { email });
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: user.id,
        action: 'LOGIN',
        description: 'User logged in successfully'
      }
    });

    logger.info('User logged in successfully', { 
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error:', { 
      error: error.message, 
      stack: error.stack,
      attemptedEmail: req.body.email
    });
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

export default router; 