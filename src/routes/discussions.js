const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { awardXP } = require('../services/xpService');
const { checkAndAwardBadges } = require('../services/badgeEngine');
const prisma = require('../lib/prisma');

// Server-side HTML sanitization
let sanitizeHtml;
try {
  const DOMPurify = require('isomorphic-dompurify');
  sanitizeHtml = (html) => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'br', 'p', 'a', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
} catch {
  sanitizeHtml = (html) => html; // fallback
}

router.use(authenticate);

// POST /api/discussions/boards
router.post('/boards', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { subject_id, class_id, title, description, type } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const board = await prisma.discussionBoard.create({
      data: {
        schoolId: req.user.school_id,
        subjectId: subject_id || null,
        classId: class_id || null,
        title,
        description,
        type: type || 'general',
        createdBy: req.user.id,
      },
    });
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/boards/subject/:subjectId
router.get('/boards/subject/:subjectId', async (req, res) => {
  try {
    const boards = await prisma.discussionBoard.findMany({
      where: { subjectId: req.params.subjectId, schoolId: req.user.school_id },
      include: {
        _count: { select: { threads: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/boards — All boards accessible to user
router.get('/boards', async (req, res) => {
  try {
    const boards = await prisma.discussionBoard.findMany({
      where: { schoolId: req.user.school_id },
      include: {
        _count: { select: { threads: true } },
        subject: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/boards/:boardId
router.get('/boards/:boardId', async (req, res) => {
  try {
    const board = await prisma.discussionBoard.findFirst({
      where: { id: req.params.boardId, schoolId: req.user.school_id },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/boards/:boardId/threads
router.get('/boards/:boardId/threads', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'latest' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orderBy =
      sort === 'popular'
        ? [{ isPinned: 'desc' }, { views: 'desc' }]
        : [{ isPinned: 'desc' }, { createdAt: 'desc' }];

    const [threads, total] = await Promise.all([
      prisma.discussionThread.findMany({
        where: {
          boardId: req.params.boardId,
          ...(sort === 'unanswered' ? { replies: { none: {} } } : {}),
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
          _count: { select: { replies: true } },
          replies: {
            where: { isAcceptedAnswer: true },
            select: { id: true },
            take: 1,
          },
        },
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.discussionThread.count({ where: { boardId: req.params.boardId } }),
    ]);

    const enriched = threads.map((t) => ({
      ...t,
      replyCount: t._count.replies,
      hasAcceptedAnswer: t.replies.length > 0,
      preview: t.body.replace(/<[^>]+>/g, '').slice(0, 150),
    }));

    res.json({ threads: enriched, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discussions/boards/:boardId/threads
router.post('/boards/:boardId/threads', async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });

    const board = await prisma.discussionBoard.findFirst({
      where: { id: req.params.boardId, schoolId: req.user.school_id },
    });
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.isLocked) return res.status(403).json({ error: 'Board is locked' });

    const thread = await prisma.discussionThread.create({
      data: {
        boardId: req.params.boardId,
        authorId: req.user.id,
        title: title.trim(),
        body: sanitizeHtml(body),
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // Non-blocking XP + badge
    Promise.resolve().then(async () => {
      if (req.user.role === 'student') {
        await awardXP(req.user.id, 10);
        await checkAndAwardBadges(req.user.id, req.user.school_id, 'discussion_participation');
      }
    });

    res.status(201).json(thread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/threads/:threadId
router.get('/threads/:threadId', async (req, res) => {
  try {
    // Increment view count
    await prisma.discussionThread.update({
      where: { id: req.params.threadId },
      data: { views: { increment: 1 } },
    });

    const thread = await prisma.discussionThread.findFirst({
      where: { id: req.params.threadId },
      include: {
        author: { select: { id: true, name: true, role: true } },
        board: { select: { id: true, title: true, isLocked: true } },
        replies: {
          where: { parentReplyId: null },
          include: {
            author: { select: { id: true, name: true, role: true } },
            replyUpvotes: true,
            childReplies: {
              include: {
                author: { select: { id: true, name: true, role: true } },
                replyUpvotes: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: [{ isAcceptedAnswer: 'desc' }, { upvotes: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    // Mark whether current user has upvoted each reply
    const enriched = {
      ...thread,
      replies: thread.replies.map((r) => ({
        ...r,
        hasUpvoted: r.replyUpvotes.some((u) => u.userId === req.user.id),
        childReplies: r.childReplies.map((cr) => ({
          ...cr,
          hasUpvoted: cr.replyUpvotes.some((u) => u.userId === req.user.id),
        })),
      })),
    };

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discussions/threads/:threadId/replies
router.post('/threads/:threadId/replies', async (req, res) => {
  try {
    const { body, parent_reply_id } = req.body;
    if (!body) return res.status(400).json({ error: 'body required' });

    const thread = await prisma.discussionThread.findFirst({
      where: { id: req.params.threadId },
      include: { author: true },
    });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (thread.isLocked) return res.status(403).json({ error: 'Thread is locked' });

    const reply = await prisma.discussionReply.create({
      data: {
        threadId: req.params.threadId,
        parentReplyId: parent_reply_id || null,
        authorId: req.user.id,
        body: sanitizeHtml(body),
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // Notify thread author
    Promise.resolve().then(async () => {
      if (thread.authorId !== req.user.id) {
        await prisma.notification.create({
          data: {
            schoolId: req.user.school_id,
            recipientId: thread.authorId,
            type: 'discussion_reply',
            title: `New reply on your thread "${thread.title}"`,
            body: `${req.user.name} replied to your discussion.`,
          },
        });
      }

      if (req.user.role === 'student') {
        await awardXP(req.user.id, 8);
        await checkAndAwardBadges(req.user.id, req.user.school_id, 'discussion_participation');
      }
    });

    res.status(201).json(reply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discussions/replies/:replyId/upvote — Toggle upvote
router.put('/replies/:replyId/upvote', async (req, res) => {
  try {
    const existing = await prisma.replyUpvote.findUnique({
      where: { userId_replyId: { userId: req.user.id, replyId: req.params.replyId } },
    });

    if (existing) {
      await prisma.replyUpvote.delete({
        where: { userId_replyId: { userId: req.user.id, replyId: req.params.replyId } },
      });
      await prisma.discussionReply.update({
        where: { id: req.params.replyId },
        data: { upvotes: { decrement: 1 } },
      });
      return res.json({ upvoted: false });
    }

    await prisma.replyUpvote.create({
      data: { userId: req.user.id, replyId: req.params.replyId },
    });
    const reply = await prisma.discussionReply.update({
      where: { id: req.params.replyId },
      data: { upvotes: { increment: 1 } },
      include: { author: { select: { id: true } } },
    });

    // Award XP to reply author for getting upvoted
    Promise.resolve().then(async () => {
      if (reply.authorId !== req.user.id) {
        await awardXP(reply.authorId, 5);
        await prisma.notification.create({
          data: {
            schoolId: req.user.school_id,
            recipientId: reply.authorId,
            type: 'discussion_upvote',
            title: 'Your reply was upvoted! 👍',
            body: `${req.user.name} upvoted your reply.`,
          },
        });
      }
    });

    res.json({ upvoted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discussions/replies/:replyId/accept — Mark as accepted answer
router.put('/replies/:replyId/accept', requireRole('teacher'), async (req, res) => {
  try {
    const reply = await prisma.discussionReply.findUnique({
      where: { id: req.params.replyId },
      include: { thread: true },
    });
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    // Toggle — unaccept all others in thread first
    await prisma.discussionReply.updateMany({
      where: { threadId: reply.threadId },
      data: { isAcceptedAnswer: false },
    });

    const newState = !reply.isAcceptedAnswer;
    const updated = await prisma.discussionReply.update({
      where: { id: req.params.replyId },
      data: { isAcceptedAnswer: newState },
    });

    if (newState) {
      await prisma.notification.create({
        data: {
          schoolId: req.user.school_id,
          recipientId: reply.authorId,
          type: 'answer_accepted',
          title: 'Your answer was accepted! ✅',
          body: `Your reply in "${reply.thread.title}" was marked as the accepted answer.`,
        },
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discussions/threads/:threadId/pin
router.put('/threads/:threadId/pin', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const thread = await prisma.discussionThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    const updated = await prisma.discussionThread.update({
      where: { id: req.params.threadId },
      data: { isPinned: !thread.isPinned },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discussions/threads/:threadId/lock
router.put('/threads/:threadId/lock', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const thread = await prisma.discussionThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    const updated = await prisma.discussionThread.update({
      where: { id: req.params.threadId },
      data: { isLocked: !thread.isLocked },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discussions/threads/:threadId
router.delete('/threads/:threadId', async (req, res) => {
  try {
    const thread = await prisma.discussionThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    if (thread.authorId !== req.user.id && !['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.discussionThread.delete({ where: { id: req.params.threadId } });
    res.json({ message: 'Thread deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discussions/replies/:replyId
router.delete('/replies/:replyId', async (req, res) => {
  try {
    const reply = await prisma.discussionReply.findUnique({ where: { id: req.params.replyId } });
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    if (reply.authorId !== req.user.id && !['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.discussionReply.delete({ where: { id: req.params.replyId } });
    res.json({ message: 'Reply deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
