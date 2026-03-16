const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const { sendPushNotification } = require('../services/pushNotification');

const prisma = require("../lib/prisma");

router.use(authenticate);

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { title, body, audience, pinned, expires_at } = req.body;

    if (!title || !body || !audience) {
      return res.status(400).json({ error: 'title, body, and audience required' });
    }

    const validAudiences = ['all', 'teachers', 'parents', 'students'];
    if (!validAudiences.includes(audience)) {
      return res.status(400).json({ error: 'Invalid audience' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        schoolId: req.user.school_id,
        createdBy: req.user.id,
        title,
        body,
        audience,
        pinned: pinned || false,
        expiresAt: expires_at ? new Date(expires_at) : null,
      },
    });

    const targetRoles = audience === 'all' 
      ? ['teacher', 'parent', 'student'] 
      : [audience.slice(0, -1)];

    const users = await prisma.user.findMany({
      where: {
        schoolId: req.user.school_id,
        role: { in: targetRoles },
      },
      select: { id: true, name: true },
    });

    for (const user of users) {
      await sendPushNotification(
        user.id,
        title,
        body.substring(0, 100),
        { type: 'announcement', announcementId: announcement.id }
      );
    }

    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    
    const where = {
      schoolId: req.user.school_id,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    };

    if (req.user.role !== 'admin') {
      where.audience = { in: ['all', req.user.role + 's'] };
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { reads: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    const announcementsWithRead = await Promise.all(
      announcements.map(async (announcement) => {
        const read = await prisma.announcementRead.findUnique({
          where: {
            announcementId_userId: {
              announcementId: announcement.id,
              userId: req.user.id,
            },
          },
        });
        return { ...announcement, isRead: !!read };
      })
    );

    res.json(announcementsWithRead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:announcementId', async (req, res) => {
  try {
    const { announcementId } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (announcement.schoolId !== req.user.school_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId: req.user.id,
        },
      },
      create: {
        announcementId,
        userId: req.user.id,
      },
      update: {
        readAt: new Date(),
      },
    });

    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:announcementId', requireRole('admin'), async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { title, body, audience, pinned, expires_at } = req.body;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (announcement.schoolId !== req.user.school_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title: title || announcement.title,
        body: body || announcement.body,
        audience: audience || announcement.audience,
        pinned: pinned !== undefined ? pinned : announcement.pinned,
        expiresAt: expires_at ? new Date(expires_at) : announcement.expiresAt,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:announcementId', requireRole('admin'), async (req, res) => {
  try {
    const { announcementId } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (announcement.schoolId !== req.user.school_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.announcement.delete({
      where: { id: announcementId },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:announcementId/reads', requireRole('admin'), async (req, res) => {
  try {
    const { announcementId } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement || announcement.schoolId !== req.user.school_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const reads = await prisma.announcementRead.findMany({
      where: { announcementId },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    const allUsers = await prisma.user.findMany({
      where: { schoolId: req.user.school_id },
      select: { id: true },
    });

    res.json({
      totalRead: reads.length,
      totalUsers: allUsers.length,
      percentage: allUsers.length > 0 ? (reads.length / allUsers.length) * 100 : 0,
      reads,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
