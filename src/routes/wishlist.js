import express from 'express';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user wishlist
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    const wishlist = await prisma.wishlists.findMany({
      where: { user_id: userId },
      include: {
        product_variants: {
          include: {
            products: true
          }
        }
      },
      orderBy: { added_at: 'desc' }
    });

    logger.info('User wishlist fetched successfully', { 
      userId,
      itemCount: wishlist.length
    });

    res.json({
      success: true,
      count: wishlist.length,
      data: wishlist
    });
  } catch (error) {
    logger.error('Error fetching user wishlist:', { 
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

// Add item to wishlist
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { variant_id } = req.body;

    // Check if variant exists
    const variant = await prisma.product_variants.findUnique({
      where: { id: variant_id }
    });

    if (!variant) {
      logger.warn('Attempt to add non-existent variant to wishlist', { 
        userId,
        variantId: variant_id 
      });
      return res.status(404).json({
        success: false,
        message: 'Product variant not found'
      });
    }

    // Check if already in wishlist
    const existingItem = await prisma.wishlists.findFirst({
      where: {
        user_id: userId,
        variant_id
      }
    });

    if (existingItem) {
      logger.warn('Attempt to add duplicate item to wishlist', { 
        userId,
        variantId: variant_id,
        wishlistItemId: existingItem.id
      });
      return res.status(400).json({
        success: false,
        message: 'Item already in wishlist'
      });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlists.create({
      data: {
        user_id: userId,
        variant_id
      },
      include: {
        product_variants: {
          include: {
            products: true
          }
        }
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'ADD_TO_WISHLIST',
        description: `Added product variant ${variant_id} to wishlist`
      }
    });

    logger.info('Item added to wishlist successfully', { 
      userId,
      wishlistItemId: wishlistItem.id,
      variantId: variant_id
    });

    res.status(201).json({
      success: true,
      data: wishlistItem
    });
  } catch (error) {
    logger.error('Error adding item to wishlist:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      variantId: req.body.variant_id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Remove item from wishlist
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const wishlistId = parseInt(req.params.id);

    // Check if wishlist item exists
    const wishlistItem = await prisma.wishlists.findFirst({
      where: {
        id: wishlistId,
        user_id: userId
      }
    });

    if (!wishlistItem) {
      logger.warn('Attempt to remove non-existent wishlist item', { 
        userId,
        wishlistItemId: wishlistId 
      });
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found'
      });
    }

    // Remove from wishlist
    await prisma.wishlists.delete({
      where: { id: wishlistId }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'REMOVE_FROM_WISHLIST',
        description: `Removed wishlist item ${wishlistId}`
      }
    });

    logger.info('Item removed from wishlist successfully', { 
      userId,
      wishlistItemId: wishlistId,
      variantId: wishlistItem.variant_id
    });

    res.json({
      success: true,
      message: 'Item removed from wishlist'
    });
  } catch (error) {
    logger.error('Error removing item from wishlist:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      wishlistItemId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 