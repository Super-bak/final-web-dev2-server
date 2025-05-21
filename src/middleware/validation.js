import { ValidationError } from './error.js';
import logger from '../lib/logger.js';

// Validate user registration
export const validateRegistration = (req, res, next) => {
  const { email, password, full_name } = req.body;

  // Check required fields
  if (!email || !password || !full_name) {
    logger.warn('Registration validation failed: Missing required fields', {
      email: !!email,
      password: !!password,
      full_name: !!full_name,
      ip: req.ip
    });
    throw new ValidationError('All fields are required');
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.warn('Registration validation failed: Invalid email format', {
      email,
      ip: req.ip
    });
    throw new ValidationError('Invalid email format');
  }

  // Validate password
  if (password.length < 6) {
    logger.warn('Registration validation failed: Password too short', {
      passwordLength: password.length,
      ip: req.ip
    });
    throw new ValidationError('Password must be at least 6 characters long');
  }

  // Validate full name
  if (full_name.length < 2) {
    logger.warn('Registration validation failed: Full name too short', {
      fullNameLength: full_name.length,
      ip: req.ip
    });
    throw new ValidationError('Full name must be at least 2 characters long');
  }

  logger.debug('Registration validation successful', { email, ip: req.ip });
  next();
};

// Validate user login
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  // Check required fields
  if (!email || !password) {
    logger.warn('Login validation failed: Missing required fields', {
      email: !!email,
      password: !!password,
      ip: req.ip
    });
    throw new ValidationError('Email and password are required');
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.warn('Login validation failed: Invalid email format', {
      email,
      ip: req.ip
    });
    throw new ValidationError('Invalid email format');
  }

  logger.debug('Login validation successful', { email, ip: req.ip });
  next();
};

// Validate product creation/update
export const validateProduct = (req, res, next) => {
  const { name, description, price, category_ids, variants, main_image_base64, images_base64 } = req.body;

  // Check required fields
  if (!name || !description || !price || !category_ids || !variants || !main_image_base64) {
    logger.warn('Product validation failed: Missing required fields', {
      name: !!name,
      description: !!description,
      price: !!price,
      category_ids: !!category_ids,
      variants: !!variants,
      main_image: !!main_image_base64,
      userId: req.user?.id
    });
    throw new ValidationError('All fields are required');
  }

  // Validate name
  if (name.length < 3) {
    logger.warn('Product validation failed: Name too short', {
      nameLength: name.length,
      userId: req.user?.id
    });
    throw new ValidationError('Product name must be at least 3 characters long');
  }

  // Validate description
  if (description.length < 10) {
    logger.warn('Product validation failed: Description too short', {
      descriptionLength: description.length,
      userId: req.user?.id
    });
    throw new ValidationError('Product description must be at least 10 characters long');
  }

  // Validate price
  if (isNaN(price) || price <= 0) {
    logger.warn('Product validation failed: Invalid price', {
      price,
      userId: req.user?.id
    });
    throw new ValidationError('Price must be a positive number');
  }

  // Validate category_ids
  if (!Array.isArray(category_ids) || category_ids.length === 0) {
    logger.warn('Product validation failed: Invalid categories', {
      category_ids,
      userId: req.user?.id
    });
    throw new ValidationError('At least one category must be selected');
  }

  // Validate variants
  if (!Array.isArray(variants) || variants.length === 0) {
    logger.warn('Product validation failed: Invalid variants', {
      variants,
      userId: req.user?.id
    });
    throw new ValidationError('At least one variant must be provided');
  }

  // Validate main image base64
  if (!main_image_base64.startsWith('data:image/')) {
    logger.warn('Product validation failed: Invalid main image format', {
      userId: req.user?.id
    });
    throw new ValidationError('Main image must be a valid base64 image');
  }

  // Validate additional images if provided
  if (images_base64) {
    if (!Array.isArray(images_base64)) {
      logger.warn('Product validation failed: Invalid additional images format', {
        userId: req.user?.id
      });
      throw new ValidationError('Additional images must be an array');
    }
    for (const img of images_base64) {
      if (!img.startsWith('data:image/')) {
        logger.warn('Product validation failed: Invalid additional image format', {
          userId: req.user?.id
        });
        throw new ValidationError('All additional images must be valid base64 images');
      }
    }
  }

  // Validate each variant
  variants.forEach((variant, index) => {
    if (!variant.sku || !variant.stock_qty || !variant.price) {
      logger.warn('Product validation failed: Missing variant fields', {
        variantIndex: index,
        userId: req.user?.id
      });
      throw new ValidationError(`Variant ${index + 1} is missing required fields`);
    }

    if (isNaN(variant.stock_qty) || variant.stock_qty < 0) {
      logger.warn('Product validation failed: Invalid stock quantity', {
        variantIndex: index,
        stockQty: variant.stock_qty,
        userId: req.user?.id
      });
      throw new ValidationError(`Variant ${index + 1} stock quantity must be a non-negative number`);
    }

    if (isNaN(variant.price) || variant.price <= 0) {
      logger.warn('Product validation failed: Invalid variant price', {
        variantIndex: index,
        price: variant.price,
        userId: req.user?.id
      });
      throw new ValidationError(`Variant ${index + 1} price must be a positive number`);
    }
  });

  logger.debug('Product validation successful', { 
    name,
    categoryCount: category_ids.length,
    variantCount: variants.length,
    userId: req.user?.id
  });
  next();
};

// Validate order creation
export const validateOrder = (req, res, next) => {
  const { items, shipping_address_id, payment_method_id } = req.body;

  // Check required fields
  if (!items || !shipping_address_id || !payment_method_id) {
    logger.warn('Order validation failed: Missing required fields', {
      items: !!items,
      shipping_address_id: !!shipping_address_id,
      payment_method_id: !!payment_method_id,
      userId: req.user?.id
    });
    throw new ValidationError('All fields are required');
  }

  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    logger.warn('Order validation failed: Invalid items', {
      items,
      userId: req.user?.id
    });
    throw new ValidationError('At least one item must be provided');
  }

  // Validate each item
  items.forEach((item, index) => {
    if (!item.variant_id || !item.quantity) {
      logger.warn('Order validation failed: Missing item fields', {
        itemIndex: index,
        userId: req.user?.id
      });
      throw new ValidationError(`Item ${index + 1} is missing required fields`);
    }

    if (isNaN(item.quantity) || item.quantity <= 0) {
      logger.warn('Order validation failed: Invalid item quantity', {
        itemIndex: index,
        quantity: item.quantity,
        userId: req.user?.id
      });
      throw new ValidationError(`Item ${index + 1} quantity must be a positive number`);
    }
  });

  logger.debug('Order validation successful', {
    itemCount: items.length,
    userId: req.user?.id
  });
  next();
};

// Validate address
export const validateAddress = (req, res, next) => {
  const { street, city, state, country, postal_code } = req.body;

  // Check required fields
  if (!street || !city || !state || !country || !postal_code) {
    logger.warn('Address validation failed: Missing required fields', {
      street: !!street,
      city: !!city,
      state: !!state,
      country: !!country,
      postal_code: !!postal_code,
      userId: req.user?.id
    });
    throw new ValidationError('All fields are required');
  }

  // Validate street
  if (street.length < 5) {
    logger.warn('Address validation failed: Street too short', {
      streetLength: street.length,
      userId: req.user?.id
    });
    throw new ValidationError('Street address must be at least 5 characters long');
  }

  // Validate city
  if (city.length < 2) {
    logger.warn('Address validation failed: City too short', {
      cityLength: city.length,
      userId: req.user?.id
    });
    throw new ValidationError('City must be at least 2 characters long');
  }

  // Validate state
  if (state.length < 2) {
    logger.warn('Address validation failed: State too short', {
      stateLength: state.length,
      userId: req.user?.id
    });
    throw new ValidationError('State must be at least 2 characters long');
  }

  // Validate country
  if (country.length < 2) {
    logger.warn('Address validation failed: Country too short', {
      countryLength: country.length,
      userId: req.user?.id
    });
    throw new ValidationError('Country must be at least 2 characters long');
  }

  // Validate postal code
  const postalCodeRegex = /^[0-9]{5}(-[0-9]{4})?$/;
  if (!postalCodeRegex.test(postal_code)) {
    logger.warn('Address validation failed: Invalid postal code format', {
      postal_code,
      userId: req.user?.id
    });
    throw new ValidationError('Invalid postal code format');
  }

  logger.debug('Address validation successful', {
    country,
    state,
    userId: req.user?.id
  });
  next();
};

// Validate payment method
export const validatePaymentMethod = (req, res, next) => {
  const { card_number, expiry_date, card_holder_name } = req.body;

  // Check required fields
  if (!card_number || !expiry_date || !card_holder_name) {
    logger.warn('Payment method validation failed: Missing required fields', {
      card_number: !!card_number,
      expiry_date: !!expiry_date,
      card_holder_name: !!card_holder_name,
      userId: req.user?.id
    });
    throw new ValidationError('All fields are required');
  }

  // Validate card number
  const cardNumberRegex = /^[0-9]{16}$/;
  if (!cardNumberRegex.test(card_number.replace(/\s/g, ''))) {
    logger.warn('Payment method validation failed: Invalid card number format', {
      userId: req.user?.id
    });
    throw new ValidationError('Invalid card number format');
  }

  // Validate expiry date
  const expiryDateRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
  if (!expiryDateRegex.test(expiry_date)) {
    logger.warn('Payment method validation failed: Invalid expiry date format', {
      expiry_date,
      userId: req.user?.id
    });
    throw new ValidationError('Invalid expiry date format (MM/YY)');
  }

  // Validate card holder name
  if (card_holder_name.length < 3) {
    logger.warn('Payment method validation failed: Card holder name too short', {
      nameLength: card_holder_name.length,
      userId: req.user?.id
    });
    throw new ValidationError('Card holder name must be at least 3 characters long');
  }

  logger.debug('Payment method validation successful', {
    cardHolderName: card_holder_name,
    userId: req.user?.id
  });
  next();
};

// Validate review
export const validateReview = (req, res, next) => {
  const { rating, comment } = req.body;

  // Check required fields
  if (!rating || !comment) {
    logger.warn('Review validation failed: Missing required fields', {
      rating: !!rating,
      comment: !!comment,
      userId: req.user?.id
    });
    throw new ValidationError('Rating and comment are required');
  }

  // Validate rating
  if (isNaN(rating) || rating < 1 || rating > 5) {
    logger.warn('Review validation failed: Invalid rating', {
      rating,
      userId: req.user?.id
    });
    throw new ValidationError('Rating must be a number between 1 and 5');
  }

  // Validate comment
  if (comment.length < 10) {
    logger.warn('Review validation failed: Comment too short', {
      commentLength: comment.length,
      userId: req.user?.id
    });
    throw new ValidationError('Comment must be at least 10 characters long');
  }

  logger.debug('Review validation successful', {
    rating,
    commentLength: comment.length,
    userId: req.user?.id
  });
  next();
};

// Validate category
export const validateCategory = (req, res, next) => {
  const { name, description } = req.body;

  // Check required fields
  if (!name) {
    logger.warn('Category validation failed: Missing name', {
      userId: req.user?.id
    });
    throw new ValidationError('Category name is required');
  }

  // Validate name
  if (name.length < 2) {
    logger.warn('Category validation failed: Name too short', {
      nameLength: name.length,
      userId: req.user?.id
    });
    throw new ValidationError('Category name must be at least 2 characters long');
  }

  // Validate description if provided
  if (description && description.length < 10) {
    logger.warn('Category validation failed: Description too short', {
      descriptionLength: description.length,
      userId: req.user?.id
    });
    throw new ValidationError('Description must be at least 10 characters long');
  }

  logger.debug('Category validation successful', {
    name,
    hasDescription: !!description,
    userId: req.user?.id
  });
  next();
}; 