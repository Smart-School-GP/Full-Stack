const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'abdullahalhaddad@altheora.com' }
  });
  
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: 'abdullahalhaddad@altheora.edu' }
    });
    console.log('Successfully updated abdullahalhaddad@altheora.com to abdullahalhaddad@altheora.edu');
  } else {
    console.log('User not found with email abdullahalhaddad@altheora.com');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
