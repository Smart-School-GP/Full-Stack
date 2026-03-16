const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../services/fileUpload');
const { sendPushNotification } = require('../services/pushNotification');
const { v4: uuidv4 } = require('uuid');

const prisma = require("../lib/prisma");

router.use(authenticate);

router.post('/conversations', requireRole('teacher'), async (req, res) => {
  try {
    const { parent_id, student_id } = req.body;

    if (!parent_id || !student_id) {
      return res.status(400).json({ error: 'parent_id and student_id required' });
    }

    const student = await prisma.user.findUnique({
      where: { id: student_id, schoolId: req.user.school_id },
    });

    if (!student || student.schoolId !== req.user.school_id) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const parent = await prisma.user.findUnique({
      where: { id: parent_id, schoolId: req.user.school_id },
    });

    if (!parent || parent.schoolId !== req.user.school_id) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        schoolId: req.user.school_id,
        teacherId: req.user.id,
        parentId,
        studentId,
      },
    });

    if (existing) {
      return res.json(existing);
    }

    const conversation = await prisma.conversation.create({
      data: {
        schoolId: req.user.school_id,
        teacherId: req.user.id,
        parentId,
        studentId,
      },
    });

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const where = {
      schoolId: req.user.school_id,
      ...(req.user.role === 'teacher'
        ? { teacherId: req.user.id }
        : req.user.role === 'parent'
        ? { parentId: req.user.id }
        : { studentId: req.user.id }),
    };

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    res.json(
      conversations.map((c) => ({
        ...c,
        lastMessage: c.messages[0] || null,
        unreadCount:
          req.user.role === 'teacher'
            ? 0
            : c.messages.filter(
                (m) => !m.isRead && m.senderId !== req.user.id
              ).length,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, schoolId: req.user.school_id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (
      conversation.teacherId !== req.user.id &&
      conversation.parentId !== req.user.id &&
      conversation.studentId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    if (req.user.role === 'parent' || req.user.role === 'teacher') {
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: req.user.id },
          isRead: false,
        },
        data: { isRead: true },
      });
    }

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { body, attachmentUrl, attachmentType } = req.body;

    if (!body && !attachmentUrl) {
      return res.status(400).json({ error: 'Message body or attachment required' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, schoolId: req.user.school_id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (
      conversation.teacherId !== req.user.id &&
      conversation.parentId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.user.id,
        body: body || '',
        attachmentUrl,
        attachmentType,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId, schoolId: req.user.school_id },
      data: { lastMessageAt: new Date() },
    });

    const recipientId =
      req.user.id === conversation.teacherId
        ? conversation.parentId
        : conversation.teacherId;

    await sendPushNotification(
      recipientId,
      `${req.user.name} sent a message`,
      body?.substring(0, 100) || 'Sent an attachment',
      { type: 'message', conversationId }
    );

    if (global.io) {
      global.io.to(`conversation:${conversationId}`).emit('new_message', message);
      global.io.to(`user:${recipientId}`).emit('message_notification', {
        conversationId,
        message,
      });
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/conversations/:conversationId/attachments',
  requireRole('teacher', 'parent'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, schoolId: req.user.school_id },
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const result = await uploadToCloudinary(
        req.file.buffer,
        `messages/${conversationId}`,
        uuidv4()
      );

      res.json({
        url: result.secure_url,
        type: req.file.mimetype,
        filename: req.file.originalname,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
