import express from 'express';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user orders
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    const orders = await prisma.orders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        order_items: {
          include: {
            product_variants: {
              include: {
                products: true
              }
            }
          }
        }
      }
    });

    logger.info('User orders fetched successfully', { 
      userId,
      orderCount: orders.length
    });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    logger.error('Error fetching user orders:', { 
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

// Get order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const orderId = parseInt(req.params.id);

    const order = await prisma.orders.findFirst({
      where: { 
        id: orderId,
        user_id: userId 
      },
      include: {
        order_items: {
          include: {
            product_variants: {
              include: {
                products: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      logger.warn('Attempt to access non-existent order', { 
        userId,
        orderId 
      });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    logger.info('Order details fetched successfully', { 
      userId,
      orderId,
      itemCount: order.order_items.length,
      totalAmount: order.total_amount
    });

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error fetching order details:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      orderId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create new order
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { items, payment_method } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      logger.warn('Invalid order creation attempt - empty items', { userId });
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Validate each item has variant_id and quantity
    for (const item of items) {
      if (!item.variant_id || !item.quantity || item.quantity < 1) {
        logger.warn('Invalid order creation attempt - invalid item data', { 
          userId,
          item
        });
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid variant_id and quantity'
        });
      }
    }

    // Fetch product variants to validate availability and get prices
    const variantIds = items.map(item => item.variant_id);
    const variants = await prisma.product_variants.findMany({
      where: { id: { in: variantIds } },
      include: { products: true }
    });

    // Check if all requested variants exist
    if (variants.length !== variantIds.length) {
      logger.warn('Order creation attempt with non-existent variants', { 
        userId,
        requestedVariants: variantIds,
        foundVariants: variants.map(v => v.id)
      });
      return res.status(400).json({
        success: false,
        message: 'One or more requested product variants do not exist'
      });
    }

    // Check stock availability and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const variant = variants.find(v => v.id === item.variant_id);
      
      if (variant.stock_qty < item.quantity) {
        logger.warn('Order creation attempt with insufficient stock', { 
          userId,
          variantId: variant.id,
          productName: variant.products.name,
          requestedQuantity: item.quantity,
          availableStock: variant.stock_qty
        });
        return res.status(400).json({
          success: false,
          message: `Not enough stock for "${variant.products.name}" (${variant.color}, ${variant.size})`
        });
      }

      totalAmount += variant.price * item.quantity;
      
      orderItems.push({
        variant_id: variant.id,
        product_name: variant.products.name,
        size: variant.size,
        color: variant.color,
        edition: variant.edition,
        unit_price: variant.price,
        quantity: item.quantity
      });
    }

    // Start a transaction to ensure atomicity
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.orders.create({
        data: {
          user_id: userId,
          total_amount: totalAmount,
          payment_method: payment_method || 'Credit Card',
          is_paid: true, // Assuming payment is processed externally
          status: 'processing',
          order_items: {
            create: orderItems
          }
        },
        include: {
          order_items: true
        }
      });

      // Update stock for each variant
      for (const item of items) {
        await tx.product_variants.update({
          where: { id: item.variant_id },
          data: {
            stock_qty: {
              decrement: item.quantity
            }
          }
        });
      }

      // Clear cart after order is created
      await tx.cart_items.deleteMany({
        where: { user_id: userId }
      });

      // Log activity
      await tx.activity_logs.create({
        data: {
          user_id: userId,
          action: 'CREATE_ORDER',
          description: `Created order #${newOrder.id} with ${items.length} items`
        }
      });

      return newOrder;
    });

    logger.info('Order created successfully', { 
      userId,
      orderId: order.id,
      itemCount: items.length,
      totalAmount,
      paymentMethod: payment_method || 'Credit Card'
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error creating order:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      items: req.body.items
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
});

export default router; 