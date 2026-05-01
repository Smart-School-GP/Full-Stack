const prisma = require('../lib/prisma');

/**
 * List all payments for admin view
 */
async function listAllPayments() {
  return prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}

/**
 * List payments for a specific parent
 */
async function listParentPayments(parentId) {
  return prisma.payment.findMany({
    where: { parentId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Issue a new payment request
 */
async function createPayment({ parentId, amount, currency, description, dueDate }) {
  return prisma.payment.create({
    data: {
      parentId,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'PENDING'
    }
  });
}

/**
 * Update payment status
 */
async function updatePaymentStatus(id, status) {
  const data = { status };
  if (status === 'PAID') {
    data.paidAt = new Date();
  }
  
  return prisma.payment.update({
    where: { id },
    data
  });
}

/**
 * Delete a payment record
 */
async function deletePayment(id) {
  return prisma.payment.delete({
    where: { id }
  });
}

module.exports = {
  listAllPayments,
  listParentPayments,
  createPayment,
  updatePaymentStatus,
  deletePayment
};
