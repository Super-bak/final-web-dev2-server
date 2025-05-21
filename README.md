# E-commerce Platform Backend

This is the backend server for the e-commerce platform, built with Node.js, Express, and PostgreSQL.

## Features

- User authentication and authorization
- Product management
- Order processing
- Shopping cart functionality
- Wishlist management
- User profile management
- Admin dashboard
- Activity logging

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add the following environment variables:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# CORS Configuration
CORS_ORIGIN="http://localhost:5173"
```

4. Set up the database:
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

## Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user

### Products
- GET /api/products - Get all products
- GET /api/products/:id - Get single product
- POST /api/products/:id/reviews - Add product review

### Orders
- GET /api/orders - Get user orders
- POST /api/orders - Create new order
- GET /api/orders/:id - Get single order

### Cart
- GET /api/cart - Get user cart
- POST /api/cart - Add item to cart
- PUT /api/cart/:id - Update cart item quantity
- DELETE /api/cart/:id - Remove item from cart

### Wishlist
- GET /api/wishlist - Get user wishlist
- POST /api/wishlist - Add item to wishlist
- DELETE /api/wishlist/:id - Remove item from wishlist

### Profile
- GET /api/profile - Get user profile
- PUT /api/profile - Update user profile
- POST /api/profile/addresses - Add address
- PUT /api/profile/addresses/:id - Update address
- DELETE /api/profile/addresses/:id - Delete address
- POST /api/profile/payment-methods - Add payment method
- PUT /api/profile/payment-methods/:id - Update payment method
- DELETE /api/profile/payment-methods/:id - Delete payment method

### Admin
- GET /api/admin/users - Get all users
- PUT /api/admin/users/:id/role - Update user role
- GET /api/admin/products - Get all products
- POST /api/admin/products - Create product
- PUT /api/admin/products/:id - Update product
- DELETE /api/admin/products/:id - Delete product
- GET /api/admin/orders - Get all orders
- PUT /api/admin/orders/:id/status - Update order status
- GET /api/admin/dashboard - Get dashboard stats

## Database Schema

The database schema is defined in `prisma/schema.prisma`. You can view and edit the database using Prisma Studio:

```bash
npm run prisma:studio
```

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (only in development)"
}
```

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 