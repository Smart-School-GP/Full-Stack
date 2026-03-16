const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');

const prisma = require("../lib/prisma");

router.use(authenticate);

// GET /api/notifications — All notifications for logged-in user
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read — Mark as read
router.put('/:id/read', async (req, res) => {
  try {
    const notif = await prisma.notification.findFirst({
      where: { id: req.params.id, recipientId: req.user.id },
    });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all — Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
