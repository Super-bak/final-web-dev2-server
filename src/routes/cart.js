import express from 'express';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user cart
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    const cart = await prisma.cart_items.findMany({
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

    // Calculate total
    const total = cart.reduce((sum, item) => {
      return sum + (item.quantity * item.product_variants.price);
    }, 0);

    logger.info('Cart fetched successfully', { 
      userId,
      itemCount: cart.length,
      total
    });

    res.json({
      success: true,
      count: cart.length,
      total,
      data: cart
    });
  } catch (error) {
    logger.error('Error fetching cart:', { 
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

// Add item to cart
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { variant_id, quantity = 1 } = req.body;

    // Check if variant exists
    const variant = await prisma.product_variants.findUnique({
      where: { id: variant_id }
    });

    if (!variant) {
      logger.warn('Attempt to add non-existent variant to cart', { 
        userId,
        variantId: variant_id 
      });
      return res.status(404).json({
        success: false,
        message: 'Product variant not found'
      });
    }

    // Check stock
    if (variant.stock_qty < quantity) {
      logger.warn('Attempt to add item with insufficient stock to cart', { 
        userId,
        variantId: variant_id,
        requestedQuantity: quantity,
        availableStock: variant.stock_qty
      });
      return res.status(400).json({
        success: false,
        message: 'Not enough stock available'
      });
    }

    // Check if already in cart
    const existingItem = await prisma.cart_items.findFirst({
      where: {
        user_id: userId,
        variant_id
      }
    });

    let cartItem;
    if (existingItem) {
      // Update quantity
      cartItem = await prisma.cart_items.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: {
          product_variants: {
            include: {
              products: true
            }
          }
        }
      });
      logger.info('Cart item quantity updated', { 
        userId,
        cartItemId: existingItem.id,
        newQuantity: existingItem.quantity + quantity,
        variantId: variant_id
      });
    } else {
      // Add new item
      cartItem = await prisma.cart_items.create({
        data: {
          user_id: userId,
          variant_id,
          quantity
        },
        include: {
          product_variants: {
            include: {
              products: true
            }
          }
        }
      });
      logger.info('New item added to cart', { 
        userId,
        cartItemId: cartItem.id,
        variantId: variant_id,
        quantity
      });
    }

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'ADD_TO_CART',
        description: `Added ${quantity} of product variant ${variant_id} to cart`
      }
    });

    res.status(201).json({
      success: true,
      data: cartItem
    });
  } catch (error) {
    logger.error('Error adding item to cart:', { 
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

// Update cart item quantity
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const cartItemId = parseInt(req.params.id);
    const { quantity } = req.body;

    // Check if cart item exists
    const cartItem = await prisma.cart_items.findFirst({
      where: {
        id: cartItemId,
        user_id: userId
      },
      include: {
        product_variants: true
      }
    });

    if (!cartItem) {
      logger.warn('Attempt to update non-existent cart item', { 
        userId,
        cartItemId 
      });
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Check stock
    if (cartItem.product_variants.stock_qty < quantity) {
      logger.warn('Attempt to update cart item with insufficient stock', { 
        userId,
        cartItemId,
        requestedQuantity: quantity,
        availableStock: cartItem.product_variants.stock_qty
      });
      return res.status(400).json({
        success: false,
        message: 'Not enough stock available'
      });
    }

    // Update quantity
    const updatedItem = await prisma.cart_items.update({
      where: { id: cartItemId },
      data: { quantity },
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
        action: 'UPDATE_CART',
        description: `Updated quantity of cart item ${cartItemId} to ${quantity}`
      }
    });

    logger.info('Cart item quantity updated', { 
      userId,
      cartItemId,
      newQuantity: quantity,
      variantId: cartItem.product_variants.id
    });

    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    logger.error('Error updating cart item:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      cartItemId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Remove item from cart
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const cartItemId = parseInt(req.params.id);

    // Check if cart item exists
    const cartItem = await prisma.cart_items.findFirst({
      where: {
        id: cartItemId,
        user_id: userId
      }
    });

    if (!cartItem) {
      logger.warn('Attempt to remove non-existent cart item', { 
        userId,
        cartItemId 
      });
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Remove from cart
    await prisma.cart_items.delete({
      where: { id: cartItemId }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'REMOVE_FROM_CART',
        description: `Removed cart item ${cartItemId}`
      }
    });

    logger.info('Item removed from cart', { 
      userId,
      cartItemId,
      variantId: cartItem.variant_id
    });

    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    logger.error('Error removing item from cart:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      cartItemId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 