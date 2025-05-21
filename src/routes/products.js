import express from 'express';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

const router = express.Router();

// Get all products with variants
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let where = {};

    // Filter by category
    if (category) {
      where.category_id = parseInt(category);
    }

    // Search by name
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Get products with their variants
    const products = await prisma.products.findMany({
      where,
      include: {
        product_variants: true,
        categories: true,
        reviews: {
          include: {
            users: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: sort === 'price-asc' ? { base_price: 'asc' } :
               sort === 'price-desc' ? { base_price: 'desc' } :
               sort === 'name-asc' ? { name: 'asc' } :
               sort === 'name-desc' ? { name: 'desc' } :
               { id: 'desc' }
    });

    logger.info('Products fetched successfully', { 
      count: products.length,
      filters: {
        category: category || 'none',
        search: search || 'none',
        sort: sort || 'default'
      }
    });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    logger.error('Error fetching products:', { 
      error: error.message, 
      stack: error.stack,
      filters: {
        category: req.query.category,
        search: req.query.search,
        sort: req.query.sort
      }
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const featuredProducts = await prisma.products.findMany({
      take: 3,
      include: {
        product_variants: true,
        categories: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    logger.info('Featured products fetched successfully', { 
      count: featuredProducts.length
    });

    res.json({
      success: true,
      data: featuredProducts
    });
  } catch (error) {
    logger.error('Error fetching featured products:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single product with variants
router.get('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      logger.warn('Invalid product ID requested', { 
        requestedId: req.params.id 
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        product_variants: true,
        categories: true,
        reviews: {
          include: {
            users: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      logger.warn('Product not found', { 
        productId 
      });
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    logger.info('Product details fetched successfully', { 
      productId,
      variantCount: product.product_variants.length,
      reviewCount: product.reviews.length
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error fetching product details:', { 
      error: error.message, 
      stack: error.stack,
      productId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add product review
router.post('/:id/reviews', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const userId = req.user.id; // From auth middleware
    const productId = parseInt(req.params.id);

    // Validate rating
    if (rating < 1 || rating > 5) {
      logger.warn('Invalid review rating attempted', { 
        userId,
        productId,
        attemptedRating: rating
      });
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const review = await prisma.reviews.create({
      data: {
        user_id: userId,
        product_id: productId,
        rating,
        comment
      },
      include: {
        users: {
          select: {
            name: true
          }
        }
      }
    });

    logger.info('Product review added successfully', { 
      userId,
      productId,
      rating,
      reviewId: review.id
    });

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Error adding product review:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id,
      productId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 