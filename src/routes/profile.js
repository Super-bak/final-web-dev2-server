import express from 'express';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true,
        addresses: true,
        payment_methods: true
      }
    });

    if (!user) {
      logger.warn('Profile fetch attempt for non-existent user', { userId });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info('User profile fetched successfully', { 
      userId,
      addressCount: user.addresses.length,
      paymentMethodCount: user.payment_methods.length
    });

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

// Update user profile
router.put('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { name } = req.body;

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'UPDATE_PROFILE',
        description: 'Updated user profile'
      }
    });

    logger.info('User profile updated successfully', { 
      userId,
      updatedName: name
    });

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    logger.error('Error updating user profile:', { 
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

// Add address
router.post('/addresses', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { street, city, state, country, postal_code, is_default } = req.body;

    // If this is the first address or marked as default, update other addresses
    if (is_default) {
      await prisma.addresses.updateMany({
        where: { user_id: userId },
        data: { is_default: false }
      });
    }

    const address = await prisma.addresses.create({
      data: {
        user_id: userId,
        street,
        city,
        state,
        country,
        postal_code,
        is_default
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'ADD_ADDRESS',
        description: 'Added new address'
      }
    });

    logger.info('New address added successfully', { 
      userId,
      addressId: address.id,
      isDefault: is_default
    });

    res.status(201).json({
      success: true,
      data: address
    });
  } catch (error) {
    logger.error('Error adding address:', { 
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

// Update address
router.put('/addresses/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const addressId = parseInt(req.params.id);
    const { street, city, state, country, postal_code, is_default } = req.body;

    // Check if address exists and belongs to user
    const address = await prisma.addresses.findFirst({
      where: {
        id: addressId,
        user_id: userId
      }
    });

    if (!address) {
      logger.warn('Attempt to update non-existent address', { 
        userId,
        addressId 
      });
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If marked as default, update other addresses
    if (is_default) {
      await prisma.addresses.updateMany({
        where: { user_id: userId },
        data: { is_default: false }
      });
    }

    const updatedAddress = await prisma.addresses.update({
      where: { id: addressId },
      data: {
        street,
        city,
        state,
        country,
        postal_code,
        is_default
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'UPDATE_ADDRESS',
        description: `Updated address ${addressId}`
      }
    });

    logger.info('Address updated successfully', { 
      userId,
      addressId,
      isDefault: is_default
    });

    res.json({
      success: true,
      data: updatedAddress
    });
  } catch (error) {
    logger.error('Error updating address:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      addressId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete address
router.delete('/addresses/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const addressId = parseInt(req.params.id);

    // Check if address exists and belongs to user
    const address = await prisma.addresses.findFirst({
      where: {
        id: addressId,
        user_id: userId
      }
    });

    if (!address) {
      logger.warn('Attempt to delete non-existent address', { 
        userId,
        addressId 
      });
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    await prisma.addresses.delete({
      where: { id: addressId }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'DELETE_ADDRESS',
        description: `Deleted address ${addressId}`
      }
    });

    logger.info('Address deleted successfully', { 
      userId,
      addressId
    });

    res.json({
      success: true,
      message: 'Address deleted'
    });
  } catch (error) {
    logger.error('Error deleting address:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      addressId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add payment method
router.post('/payment-methods', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { card_number, expiry_date, card_holder_name, is_default } = req.body;

    // If this is the first payment method or marked as default, update others
    if (is_default) {
      await prisma.payment_methods.updateMany({
        where: { user_id: userId },
        data: { is_default: false }
      });
    }

    const paymentMethod = await prisma.payment_methods.create({
      data: {
        user_id: userId,
        card_number,
        expiry_date,
        card_holder_name,
        is_default
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'ADD_PAYMENT_METHOD',
        description: 'Added new payment method'
      }
    });

    logger.info('New payment method added successfully', { 
      userId,
      paymentMethodId: paymentMethod.id,
      isDefault: is_default
    });

    res.status(201).json({
      success: true,
      data: paymentMethod
    });
  } catch (error) {
    logger.error('Error adding payment method:', { 
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

// Update payment method
router.put('/payment-methods/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const paymentMethodId = parseInt(req.params.id);
    const { card_number, expiry_date, card_holder_name, is_default } = req.body;

    // Check if payment method exists and belongs to user
    const paymentMethod = await prisma.payment_methods.findFirst({
      where: {
        id: paymentMethodId,
        user_id: userId
      }
    });

    if (!paymentMethod) {
      logger.warn('Attempt to update non-existent payment method', { 
        userId,
        paymentMethodId 
      });
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // If marked as default, update others
    if (is_default) {
      await prisma.payment_methods.updateMany({
        where: { user_id: userId },
        data: { is_default: false }
      });
    }

    const updatedPaymentMethod = await prisma.payment_methods.update({
      where: { id: paymentMethodId },
      data: {
        card_number,
        expiry_date,
        card_holder_name,
        is_default
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'UPDATE_PAYMENT_METHOD',
        description: `Updated payment method ${paymentMethodId}`
      }
    });

    logger.info('Payment method updated successfully', { 
      userId,
      paymentMethodId,
      isDefault: is_default
    });

    res.json({
      success: true,
      data: updatedPaymentMethod
    });
  } catch (error) {
    logger.error('Error updating payment method:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      paymentMethodId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete payment method
router.delete('/payment-methods/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const paymentMethodId = parseInt(req.params.id);

    // Check if payment method exists and belongs to user
    const paymentMethod = await prisma.payment_methods.findFirst({
      where: {
        id: paymentMethodId,
        user_id: userId
      }
    });

    if (!paymentMethod) {
      logger.warn('Attempt to delete non-existent payment method', { 
        userId,
        paymentMethodId 
      });
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    await prisma.payment_methods.delete({
      where: { id: paymentMethodId }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'DELETE_PAYMENT_METHOD',
        description: `Deleted payment method ${paymentMethodId}`
      }
    });

    logger.info('Payment method deleted successfully', { 
      userId,
      paymentMethodId
    });

    res.json({
      success: true,
      message: 'Payment method deleted'
    });
  } catch (error) {
    logger.error('Error deleting payment method:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      paymentMethodId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user orders
router.get('/orders', authenticate, async (req, res) => {
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

export default router; 