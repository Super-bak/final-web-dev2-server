import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanDatabase() {
  // Delete all records in reverse order of dependencies
  await prisma.order_items.deleteMany({});
  await prisma.orders.deleteMany({});
  await prisma.reviews.deleteMany({});
  await prisma.wishlists.deleteMany({});
  await prisma.product_variants.deleteMany({});
  await prisma.products.deleteMany({});
  await prisma.categories.deleteMany({});
  await prisma.activity_logs.deleteMany({});
  
  console.log('Database cleaned successfully');
}

async function main() {
  await cleanDatabase();

  // Create categories
  const categories = await Promise.all([
    prisma.categories.create({
      data: {
        name: 'Graphic Tees',
        discount: 0.00
      }
    }),
    prisma.categories.create({
      data: {
        name: 'Plain Tees',
        discount: 0.00
      }
    }),
    prisma.categories.create({
      data: {
        name: 'Limited Edition',
        discount: 0.10 // 10% discount
      }
    })
  ]);

  // Create products with their variants
  const products = [];
  
  // Graphic Tees
  const rockBandTee = await prisma.products.create({
    data: {
      name: 'Vintage Rock Band Tee',
      description: 'Classic rock band design with distressed look',
      base_price: 29.99,
      category_id: categories[0].id,
      image_url: 'https://example.com/rock-band-tee.jpg',
      product_variants: {
        create: [
          {
            size: 'S',
            color: 'Black',
            price: 29.99,
            stock_qty: 50
          },
          {
            size: 'M',
            color: 'Black',
            price: 29.99,
            stock_qty: 75
          },
          {
            size: 'L',
            color: 'Black',
            price: 29.99,
            stock_qty: 60
          }
        ]
      }
    },
    include: {
      product_variants: true
    }
  });
  products.push(rockBandTee);

  const streetArtTee = await prisma.products.create({
    data: {
      name: 'Urban Street Art Tee',
      description: 'Modern street art inspired design',
      base_price: 34.99,
      category_id: categories[0].id,
      image_url: 'https://example.com/street-art-tee.jpg',
      product_variants: {
        create: [
          {
            size: 'S',
            color: 'White',
            price: 34.99,
            stock_qty: 40
          },
          {
            size: 'M',
            color: 'White',
            price: 34.99,
            stock_qty: 55
          },
          {
            size: 'L',
            color: 'White',
            price: 34.99,
            stock_qty: 45
          }
        ]
      }
    },
    include: {
      product_variants: true
    }
  });
  products.push(streetArtTee);

  // Plain Tees
  const premiumCottonTee = await prisma.products.create({
    data: {
      name: 'Premium Cotton Tee',
      description: 'High-quality 100% organic cotton t-shirt',
      base_price: 24.99,
      category_id: categories[1].id,
      image_url: 'https://example.com/premium-cotton-tee.jpg',
      product_variants: {
        create: [
          {
            size: 'S',
            color: 'Navy',
            price: 24.99,
            stock_qty: 100
          },
          {
            size: 'M',
            color: 'Navy',
            price: 24.99,
            stock_qty: 120
          },
          {
            size: 'L',
            color: 'Navy',
            price: 24.99,
            stock_qty: 90
          }
        ]
      }
    },
    include: {
      product_variants: true
    }
  });
  products.push(premiumCottonTee);

  // Limited Edition
  const artistCollabTee = await prisma.products.create({
    data: {
      name: 'Artist Collaboration Tee',
      description: 'Limited edition collaboration with famous artist',
      base_price: 49.99,
      category_id: categories[2].id,
      image_url: 'https://example.com/artist-collab-tee.jpg',
      product_variants: {
        create: [
          {
            size: 'S',
            color: 'Limited Edition Red',
            edition: 'First Edition',
            price: 49.99,
            stock_qty: 20
          },
          {
            size: 'M',
            color: 'Limited Edition Red',
            edition: 'First Edition',
            price: 49.99,
            stock_qty: 25
          },
          {
            size: 'L',
            color: 'Limited Edition Red',
            edition: 'First Edition',
            price: 49.99,
            stock_qty: 15
          }
        ]
      }
    },
    include: {
      product_variants: true
    }
  });
  products.push(artistCollabTee);

  // Get or create test user
  let testUser = await prisma.users.findUnique({
    where: { email: 'test@example.com' }
  });

  if (!testUser) {
    testUser = await prisma.users.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password_hash: '$2a$10$K8L1J9Z9Z9Z9Z9Z9Z9Z9Z.9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z' // hashed 'password123'
      }
    });
  }

  // Create some reviews
  await Promise.all([
    prisma.reviews.create({
      data: {
        user_id: testUser.id,
        product_id: products[0].id,
        rating: 5,
        comment: 'Great quality and design!'
      }
    }),
    prisma.reviews.create({
      data: {
        user_id: testUser.id,
        product_id: products[1].id,
        rating: 4,
        comment: 'Love the design, but runs a bit small'
      }
    })
  ]);

  // Create a sample order
  const order = await prisma.orders.create({
    data: {
      user_id: testUser.id,
      total_amount: 64.98,
      payment_method: 'CREDIT_CARD',
      is_paid: true,
      status: 'completed',
      order_items: {
        create: [
          {
            variant_id: products[0].product_variants[0].id,
            product_name: products[0].name,
            size: products[0].product_variants[0].size,
            color: products[0].product_variants[0].color,
            unit_price: products[0].product_variants[0].price,
            quantity: 1
          },
          {
            variant_id: products[1].product_variants[0].id,
            product_name: products[1].name,
            size: products[1].product_variants[0].size,
            color: products[1].product_variants[0].color,
            unit_price: products[1].product_variants[0].price,
            quantity: 1
          }
        ]
      }
    }
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 