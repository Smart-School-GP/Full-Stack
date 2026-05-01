const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { requireRole, authenticate } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

// Admin only: List all payments
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const payments = await paymentService.listAllPayments();
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
});

// Parent: List own payments
router.get('/my', requireRole('parent'), async (req, res, next) => {
  try {
    const payments = await paymentService.listParentPayments(req.user.id);
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
});

// Admin only: Create payment
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment(req.body);
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
});

// Admin only: Update status
router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const payment = await paymentService.updatePaymentStatus(req.params.id, status);
    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
});

// Admin only: Delete payment
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await paymentService.deletePayment(req.params.id);
    res.json({ success: true, message: 'Payment deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
