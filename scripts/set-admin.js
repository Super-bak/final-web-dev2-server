import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Function to set a user as admin by email
async function setUserAsAdmin(email) {
  try {
    const user = await prisma.users.update({
      where: {
        email: email
      },
      data: {
        role: 'admin'
      }
    });

    console.log(`User ${email} has been set as admin:`, user);
    return user;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Check if email argument is provided
if (process.argv.length < 3) {
  console.log('Please provide an email address');
  process.exit(1);
}

const userEmail = process.argv[2];

// Run the function
setUserAsAdmin(userEmail)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 