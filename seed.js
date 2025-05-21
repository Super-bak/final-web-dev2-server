import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create user
  console.log('Creating test user...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.users.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password_hash: hashedPassword,
      name: 'Test User'
    }
  });

  console.log(`Created user with id: ${user.id}`);

  // Create categories
  console.log('Creating categories...');
  const tShirtCategory = await prisma.categories.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'T-Shirts',
      discount: 0
    }
  });

  const hoodiesCategory = await prisma.categories.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Hoodies',
      discount: 0
    }
  });

  // Create products
  console.log('Creating products...');
  const product1 = await prisma.products.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Classic Cotton T-Shirt',
      description: 'Comfortable cotton t-shirt with a classic fit',
      base_price: 19.99,
      category_id: tShirtCategory.id,
      image_url: 'https://via.placeholder.com/300'
    }
  });

  const product2 = await prisma.products.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Premium Zip Hoodie',
      description: 'High-quality hoodie with zip front',
      base_price: 49.99,
      category_id: hoodiesCategory.id,
      image_url: 'https://via.placeholder.com/300'
    }
  });

  // Create product variants
  console.log('Creating product variants...');
  const variant1 = await prisma.product_variants.upsert({
    where: { id: 1 },
    update: {},
    create: {
      product_id: product1.id,
      size: 'M',
      color: 'Blue',
      price: 19.99,
      stock_qty: 100
    }
  });

  const variant2 = await prisma.product_variants.upsert({
    where: { id: 2 },
    update: {},
    create: {
      product_id: product1.id,
      size: 'L',
      color: 'Red',
      price: 19.99,
      stock_qty: 50
    }
  });

  const variant3 = await prisma.product_variants.upsert({
    where: { id: 3 },
    update: {},
    create: {
      product_id: product2.id,
      size: 'M',
      color: 'Black',
      price: 49.99,
      stock_qty: 75
    }
  });

  // Create cart items
  console.log('Creating cart items...');
  const cartItem1 = await prisma.cart_items.upsert({
    where: { id: 1 },
    update: {},
    create: {
      user_id: user.id,
      variant_id: variant1.id,
      quantity: 2
    }
  });

  const cartItem2 = await prisma.cart_items.upsert({
    where: { id: 2 },
    update: {},
    create: {
      user_id: user.id,
      variant_id: variant3.id,
      quantity: 1
    }
  });

  // Create orders
  console.log('Creating orders...');
  const order1 = await prisma.orders.upsert({
    where: { id: 1 },
    update: {},
    create: {
      user_id: user.id,
      total_amount: 89.97,
      payment_method: 'Credit Card',
      is_paid: true,
      status: 'delivered',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    }
  });

  const order2 = await prisma.orders.upsert({
    where: { id: 2 },
    update: {},
    create: {
      user_id: user.id,
      total_amount: 39.98,
      payment_method: 'PayPal',
      is_paid: true,
      status: 'processing',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    }
  });

  // Create order items
  console.log('Creating order items...');
  const orderItem1 = await prisma.order_items.upsert({
    where: { id: 1 },
    update: {},
    create: {
      order_id: order1.id,
      variant_id: variant1.id,
      product_name: product1.name,
      size: variant1.size,
      color: variant1.color,
      unit_price: variant1.price,
      quantity: 2
    }
  });

  const orderItem2 = await prisma.order_items.upsert({
    where: { id: 2 },
    update: {},
    create: {
      order_id: order1.id,
      variant_id: variant3.id,
      product_name: product2.name,
      size: variant3.size,
      color: variant3.color,
      unit_price: variant3.price,
      quantity: 1
    }
  });

  const orderItem3 = await prisma.order_items.upsert({
    where: { id: 3 },
    update: {},
    create: {
      order_id: order2.id,
      variant_id: variant2.id,
      product_name: product1.name,
      size: variant2.size,
      color: variant2.color,
      unit_price: variant2.price,
      quantity: 2
    }
  });

  // Create user addresses
  console.log('Creating user address...');
  const address = await prisma.addresses.upsert({
    where: { id: 1 },
    update: {},
    create: {
      user_id: user.id,
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postal_code: '10001',
      is_default: true
    }
  });

  // Create payment method
  console.log('Creating payment method...');
  const paymentMethod = await prisma.payment_methods.upsert({
    where: { id: 1 },
    update: {},
    create: {
      user_id: user.id,
      card_number: '4111111111111111',
      expiry_date: '12/25',
      card_holder_name: 'Test User',
      is_default: true
    }
  });

  console.log('Database seeded successfully!');

  // Login credentials
  console.log('\nUse these credentials to login:');
  console.log('Email: user@example.com');
  console.log('Password: password123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 