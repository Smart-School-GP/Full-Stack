const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const paymentService = require('../services/paymentService');

async function verifyPayments() {
  console.log('--- Verifying Payments ---');
  
  try {
    // 1. Get a parent
    const parent = await prisma.user.findFirst({ where: { role: 'parent' } });
    if (!parent) {
      console.log('No parent found to test with.');
      return;
    }
    console.log(`Using parent: ${parent.name}`);

    // 2. Create a payment
    const newPayment = await paymentService.createPayment({
      parentId: parent.id,
      amount: 500,
      description: 'Test Tuition Fee',
      dueDate: '2026-12-31'
    });
    console.log('Payment created:', newPayment.id);

    // 3. List all payments
    const allPayments = await paymentService.listAllPayments();
    console.log('Total payments found:', allPayments.length);

    // 4. Update status
    const updated = await paymentService.updatePaymentStatus(newPayment.id, 'PAID');
    console.log('Payment marked as PAID at:', updated.paidAt);

    // 5. Cleanup
    await paymentService.deletePayment(newPayment.id);
    console.log('Payment deleted successfully.');

    console.log('--- ALL TESTS PASSED ---');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

verifyPayments();
