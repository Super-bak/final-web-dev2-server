import express from 'express';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { validateCategory } from '../middleware/validation.js';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    logger.error('Error fetching categories:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single category with products
router.get('/:id', async (req, res) => {
  try {
    const category = await prisma.categories.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        products: {
          include: {
            products: {
              include: {
                product_variants: true
              }
            }
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('Error fetching single category:', { error: error.message, stack: error.stack, categoryId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create category (admin only)
router.post('/', authenticate, authorizeAdmin, validateCategory, async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await prisma.categories.create({
      data: {
        name,
        description
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id,
        action: 'CREATE_CATEGORY',
        description: `Created category ${category.id}`
      }
    });

    logger.info('Category created successfully', { categoryId: category.id, userId: req.user.id });
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('Error creating category:', { error: error.message, stack: error.stack, userId: req.user.id });
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update category (admin only)
router.put('/:id', authenticate, authorizeAdmin, validateCategory, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { name, description } = req.body;

    const category = await prisma.categories.update({
      where: { id: categoryId },
      data: {
        name,
        description
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id,
        action: 'UPDATE_CATEGORY',
        description: `Updated category ${categoryId}`
      }
    });

    logger.info('Category updated successfully', { categoryId, userId: req.user.id });
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('Error updating category:', { error: error.message, stack: error.stack, categoryId: req.params.id, userId: req.user.id });
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    // Check if category has products
    const category = await prisma.categories.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (category._count.products > 0) {
      logger.warn('Attempted to delete category with products', { categoryId, productCount: category._count.products });
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with associated products'
      });
    }

    await prisma.categories.delete({
      where: { id: categoryId }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id,
        action: 'DELETE_CATEGORY',
        description: `Deleted category ${categoryId}`
      }
    });

    logger.info('Category deleted successfully', { categoryId, userId: req.user.id });
    res.json({
      success: true,
      message: 'Category deleted'
    });
  } catch (error) {
    logger.error('Error deleting category:', { error: error.message, stack: error.stack, categoryId: req.params.id, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 