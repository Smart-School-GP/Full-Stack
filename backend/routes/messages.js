const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createConversationSchema,
  sendMessageSchema,
  startConversationWithTeacherSchema,
} = require('../schemas/messages.schemas');
const { upload, uploadToCloudinary } = require('../services/fileUpload');
const { sendPushNotification } = require('../services/pushNotification');
const { v4: uuidv4 } = require('uuid');

const prisma = require("../lib/prisma");

let _sanitizeMessage;
try {
  const DOMPurify = require('isomorphic-dompurify');
  _sanitizeMessage = (text) => DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: [],
  });
} catch {
  _sanitizeMessage = (text) => text;
}

function sanitizeMessage(text) {
  if (!text) return text;
  return _sanitizeMessage(text);
}

router.use(authenticate);

router.post('/conversations', requireRole('teacher'), validate(createConversationSchema), async (req, res) => {
  try {
    const { parent_id, student_id } = req.body;

    if (!parent_id || !student_id) {
      return res.status(400).json({ error: 'parent_id and student_id required' });
    }

    const student = await prisma.user.findUnique({
      where: { id: student_id },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const parent = await prisma.user.findUnique({
      where: { id: parent_id },
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        teacherId: req.user.id,
        parentId: parent_id,
        studentId: student_id,
      },
    });

    if (existing) {
      return res.json({ success: true, data: existing });
    }

    const conversation = await prisma.conversation.create({
      data: {
        teacherId: req.user.id,
        parentId: parent_id,
        studentId: student_id,
      },
    });

    res.json({ success: true, data: conversation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Parent-initiated conversation: find an existing thread with a given
 * teacher about a specific child, or create a new one.
 *
 * Authorization: requester must be (a) a parent of student_id, and
 * (b) student_id must actually be in a room taught by teacher_id.
 */
router.post(
  '/conversations/with-teacher',
  requireRole('parent'),
  validate(startConversationWithTeacherSchema),
  async (req, res) => {
    try {
      const { teacher_id, student_id } = req.body;

      const link = await prisma.parentStudent.findFirst({
        where: { parentId: req.user.id, studentId: student_id },
      });
      if (!link) {
        return res.status(403).json({ error: 'Not authorized for this student' });
      }

      const teaches = await prisma.subject.findFirst({
        where: {
          teacherId: teacher_id,
          room: {
            students: { some: { studentId: student_id } },
          },
        },
        select: { id: true },
      });
      if (!teaches) {
        return res.status(403).json({ error: 'Teacher does not teach this student' });
      }

      const conversation = await prisma.conversation.upsert({
        where: {
          teacherId_parentId_studentId: {
            teacherId: teacher_id,
            parentId: req.user.id,
            studentId: student_id,
          },
        },
        update: {},
        create: {
          teacherId: teacher_id,
          parentId: req.user.id,
          studentId: student_id,
        },
        include: {
          teacher: { select: { id: true, name: true } },
          parent: { select: { id: true, name: true } },
          student: { select: { id: true, name: true } },
        },
      });

      res.json({ success: true, data: conversation });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/conversations', async (req, res) => {
  try {
    const where = {
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

    res.json({
      success: true,
      data: conversations.map((c) => ({
        ...c,
        lastMessage: c.messages[0] || null,
        unreadCount:
          req.user.role === 'teacher'
            ? 0
            : c.messages.filter(
                (m) => !m.isRead && m.senderId !== req.user.id
              ).length,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conversations/:conversationId/messages', validate(sendMessageSchema), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { body, attachmentUrl, attachmentType } = req.body;

    if (!body && !attachmentUrl) {
      return res.status(400).json({ error: 'Message body or attachment required' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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
        body: sanitizeMessage(body) || '',
        attachmentUrl,
        attachmentType,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
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

    res.json({ success: true, data: message });
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
        where: { id: conversationId },
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
        success: true,
        data: {
          url: result.secure_url,
          type: req.file.mimetype,
          filename: req.file.originalname,
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
