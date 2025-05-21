import express from 'express';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { uploadImageToSupabase } from '../utils/imageUpload.js';
import { deleteImageFromSupabase } from '../utils/imageDelete.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Apply authentication and authorization to all admin routes
router.use(authenticate);
router.use(authorizeAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true,
        role: true
      }
    });

    logger.info('Users fetched successfully', { count: users.length });
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error('Error fetching users:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    // Validate role
    if (role !== 'admin' && role !== 'client') {
      logger.warn('Invalid role update attempt', { userId, attemptedRole: role });
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either "admin" or "client"'
      });
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id, // Admin's ID
        action: 'UPDATE_USER_ROLE',
        description: `Updated user ${userId} role to ${role}`
      }
    });

    logger.info('User role updated successfully', { userId, newRole: role, updatedBy: req.user.id });
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    logger.error('Error updating user role:', { error: error.message, stack: error.stack, userId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      include: {
        categories: true,
        product_variants: true
      }
    });

    logger.info('Products fetched successfully', { count: products.length });
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    logger.error('Error fetching products:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create product
router.post('/products', upload.fields([
  { name: 'main_image', maxCount: 1 },
  { name: 'additional_images', maxCount: 5 }
]), async (req, res) => {
  try {
    const {
      name,
      description,
      base_price,
      category_ids,
      variants
    } = req.body;

    // Parse JSON strings back to objects
    const parsedCategoryIds = JSON.parse(category_ids);
    const parsedVariants = JSON.parse(variants);

    // Upload main image to Supabase
    const mainImageFile = req.files['main_image'][0];
    const mainImageFileName = `products/${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    const mainImageUrl = await uploadImageToSupabase(mainImageFile.buffer, mainImageFileName);

    // Upload additional images if any
    let additionalImageUrls = [];
    if (req.files['additional_images']) {
      additionalImageUrls = await Promise.all(
        req.files['additional_images'].map(async (file, index) => {
          const fileName = `products/${Date.now()}-${index}-${name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
          return await uploadImageToSupabase(file.buffer, fileName);
        })
      );
    }

    const product = await prisma.products.create({
      data: {
        name,
        description,
        base_price: parseFloat(base_price),
        image_url: mainImageUrl,
        category_id: parseInt(parsedCategoryIds[0]),
        product_variants: {
          create: parsedVariants.map(variant => ({
            size: variant.size,
            color: variant.color,
            stock_qty: variant.stock_qty,
            price: variant.price
          }))
        }
      },
      include: {
        categories: true,
        product_variants: true
      }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id,
        action: 'CREATE_PRODUCT',
        description: `Created product ${product.id}`
      }
    });

    logger.info('Product created successfully', { 
      productId: product.id, 
      name: product.name,
      createdBy: req.user.id,
      variantCount: parsedVariants.length
    });
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error creating product:', { 
      error: error.message, 
      stack: error.stack,
      createdBy: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const {
      name,
      description,
      price,
      category_ids,
      variants,
      main_image_base64,
      images_base64
    } = req.body;

    let imageUrl;
    if (main_image_base64) {
      // Upload new image to Supabase
      const fileName = `products/${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}.jpg`
      imageUrl = await uploadImageToSupabase(main_image_base64, fileName)
    }

    // Update product
    const product = await prisma.products.update({
      where: { id: productId },
      data: {
        name,
        description,
        price,
        ...(imageUrl && { image_url: imageUrl }), // Only update image_url if new image was uploaded
        categories: {
          set: category_ids.map(id => ({ id: parseInt(id) }))
        }
      },
      include: {
        categories: true,
        product_variants: true
      }
    });

    // Update variants
    for (const variant of variants) {
      if (variant.id) {
        // Update existing variant
        await prisma.product_variants.update({
          where: { id: variant.id },
          data: {
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            stock_qty: variant.stock_qty,
            price: variant.price
          }
        });
      } else {
        // Create new variant
        await prisma.product_variants.create({
          data: {
            product_id: productId,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            stock_qty: variant.stock_qty,
            price: variant.price
          }
        });
      }
    }

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id,
        action: 'UPDATE_PRODUCT',
        description: `Updated product ${productId}`
      }
    });

    logger.info('Product updated successfully', { 
      productId, 
      updatedBy: req.user.id,
      hasNewImage: !!imageUrl
    });
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error updating product:', { 
      error: error.message, 
      stack: error.stack, 
      productId: req.params.id,
      updatedBy: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    // Get the product to get its image URL
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { image_url: true }
    });

    // Delete image from Supabase if it exists
    if (product?.image_url) {
      const fileName = product.image_url.split('/').pop(); // Get filename from URL
      await deleteImageFromSupabase(`products/${fileName}`);
    }

    // Delete product variants first
    await prisma.product_variants.deleteMany({
      where: { product_id: productId }
    });

    // Delete product
    await prisma.products.delete({
      where: { id: productId }
    });

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id,
        action: 'DELETE_PRODUCT',
        description: `Deleted product ${productId}`
      }
    });

    logger.info('Product deleted successfully', { 
      productId, 
      deletedBy: req.user.id,
      hadImage: !!product?.image_url
    });
    res.json({
      success: true,
      message: 'Product deleted'
    });
  } catch (error) {
    logger.error('Error deleting product:', { 
      error: error.message, 
      stack: error.stack, 
      productId: req.params.id,
      deletedBy: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.orders.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            full_name: true
          }
        },
        order_items: {
          include: {
            product_variants: {
              include: {
                products: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    logger.info('Orders fetched successfully', { count: orders.length });
    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    logger.error('Error fetching orders:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    const order = await prisma.orders.update({
      where: { id: orderId },
      data: { status },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            full_name: true
          }
        },
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

    // Log activity
    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id, // Admin's ID
        action: 'UPDATE_ORDER_STATUS',
        description: `Updated order ${orderId} status to ${status}`
      }
    });

    logger.info('Order status updated successfully', { 
      orderId, 
      newStatus: status,
      updatedBy: req.user.id
    });
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error updating order status:', { 
      error: error.message, 
      stack: error.stack, 
      orderId: req.params.id,
      updatedBy: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    // Get total users
    const totalUsers = await prisma.users.count();

    // Get total products
    const totalProducts = await prisma.products.count();

    // Get total orders
    const totalOrders = await prisma.orders.count();

    // Get total revenue
    const orders = await prisma.orders.findMany({
      where: { status: 'COMPLETED' }
    });
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);

    // Get recent orders
    const recentOrders = await prisma.orders.findMany({
      take: 5,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            full_name: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Get low stock products
    const lowStockProducts = await prisma.product_variants.findMany({
      where: {
        stock_qty: {
          lte: 10
        }
      },
      include: {
        products: true
      }
    });

    logger.info('Dashboard stats fetched successfully', {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentOrdersCount: recentOrders.length,
      lowStockProductsCount: lowStockProducts.length
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        recentOrders,
        lowStockProducts
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 