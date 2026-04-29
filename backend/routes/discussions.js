const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createBoardSchema,
  createThreadSchema,
  createReplySchema,
} = require('../schemas/discussions.schemas');
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
  sanitizeHtml = (html) => html;
}

router.use(authenticate);

// Standard success envelope used across the API ({ success, data }).
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ── Membership helpers ──────────────────────────────────────────────────────
//
// A "board" is bound to a subject (preferred) or a room. Membership rules:
//   • admin                         → moderator + member  (everywhere)
//   • subject's teacher             → moderator + member  on that subject's board
//   • student enrolled in the room  → member               on that subject's board
//   • teacher of a roomwide board   → moderator + member  on that room's board
//
// `loadBoardWithAccess` returns { board, isMember, isModerator } and is the
// single source of truth for who can see / post / moderate on a given board.

async function loadBoardWithAccess(boardId, user) {
  const board = await prisma.discussionBoard.findFirst({
    where: { id: boardId },
    include: {
      subject: { select: { id: true, teacherId: true, roomId: true } },
      room: { select: { id: true } },
    },
  });
  if (!board) return { board: null, isMember: false, isModerator: false };
  return { board, ...computeBoardAccess(board, user) };
}

async function computeBoardAccess(board, user) {
  if (user.role === 'admin') return { isMember: true, isModerator: true };

  // Personal boards: only accessible by creator and target
  if (board.type === 'personal') {
    const isParticipant = board.createdBy === user.id || board.targetUserId === user.id;
    return { 
      isMember: isParticipant, 
      isModerator: board.createdBy === user.id 
    };
  }

  // Class / Class Parents boards
  if (board.type === 'class' || board.type === 'class_parents') {
    if (user.role === 'teacher') {
      const isRoomTeacher = await prisma.teacherRoom.findUnique({
        where: { teacherId_roomId: { teacherId: user.id, roomId: board.roomId } }
      });
      if (isRoomTeacher) return { isMember: true, isModerator: true };
    }

    if (board.type === 'class' && user.role === 'student') {
      const isEnrolled = await prisma.studentRoom.findUnique({
        where: { studentId_roomId: { studentId: user.id, roomId: board.roomId } }
      });
      if (isEnrolled) return { isMember: true, isModerator: false };
    }

    if (board.type === 'class_parents' && user.role === 'parent') {
      const childrenRooms = await prisma.parentStudent.findMany({
        where: { parentId: user.id },
        include: { student: { include: { studentRooms: { where: { roomId: board.roomId } } } } }
      });
      const hasChildInRoom = childrenRooms.some(cs => cs.student.studentRooms.length > 0);
      if (hasChildInRoom) return { isMember: true, isModerator: false };
    }
  }

  const subjectTeacherId = board.subject?.teacherId ?? null;
  const scopeRoomId = board.subject?.roomId ?? board.roomId ?? null;

  if (user.role === 'teacher' && subjectTeacherId === user.id) {
    return { isMember: true, isModerator: true };
  }

  return {
    isMember: false,
    isModerator: false,
    scopeRoomId,
    subjectTeacherId,
  };
}

// Resolves the boards the current user is allowed to see (used by list endpoints).
async function getAccessibleBoardWhere(user) {
  if (user.role === 'admin') return {};

  if (user.role === 'teacher') {
    const teacherRooms = await prisma.teacherRoom.findMany({
      where: { teacherId: user.id },
      select: { roomId: true },
    });
    const roomIds = teacherRooms.map((r) => r.roomId);
    return {
      OR: [
        { subject: { teacherId: user.id } },
        { subjectId: null, roomId: { in: roomIds } },
        { type: 'personal', createdBy: user.id },
        { type: 'personal', targetUserId: user.id },
      ],
    };
  }

  if (user.role === 'student') {
    const studentRooms = await prisma.studentRoom.findMany({
      where: { studentId: user.id },
      select: { roomId: true },
    });
    const roomIds = studentRooms.map((r) => r.roomId);
    return {
      OR: [
        { subject: { roomId: { in: roomIds } } },
        { subjectId: null, roomId: { in: roomIds }, type: { in: ['general', 'class'] } },
        { type: 'personal', targetUserId: user.id },
      ],
    };
  }

  if (user.role === 'parent') {
    const childrenRooms = await prisma.parentStudent.findMany({
      where: { parentId: user.id },
      include: { student: { include: { studentRooms: { select: { roomId: true } } } } }
    });
    const roomIds = Array.from(new Set(childrenRooms.flatMap(cs => cs.student.studentRooms.map(sr => sr.roomId))));
    return {
      OR: [
        { type: 'class_parents', roomId: { in: roomIds } },
        { type: 'personal', targetUserId: user.id },
      ],
    };
  }

  return { id: 'none' };
}

async function isStudentInRoom(studentId, roomId) {
  if (!roomId) return false;
  const sr = await prisma.studentRoom.findUnique({
    where: { studentId_roomId: { studentId, roomId } },
  });
  return Boolean(sr);
}

// Final-shape access check. Calls the full membership computation including
// the (async) student-in-room lookup.
async function assertBoardAccess(boardId, user, { requireModerator = false } = {}) {
  const { board, isMember, isModerator, scopeRoomId } =
    await loadBoardWithAccess(boardId, user);
  if (!board) return { error: { status: 404, message: 'Board not found' } };

  let memberOK = isMember;
  if (!memberOK && user.role === 'student') {
    memberOK = await isStudentInRoom(user.id, scopeRoomId);
  }
  if (requireModerator && !isModerator) {
    return { board, error: { status: 403, message: 'Only the subject teacher can moderate this board' } };
  }
  if (!memberOK && !isModerator) {
    return { board, error: { status: 403, message: 'You do not have access to this board' } };
  }
  return { board, isMember: memberOK, isModerator };
}

// ── Routes ──────────────────────────────────────────────────────────────────

// POST /api/discussions/boards
// Teachers can create boards only for subjects they teach. Admins: any subject.
router.post('/boards', requireRole('teacher', 'admin'), validate(createBoardSchema), async (req, res) => {
  try {
    const { subject_id, room_id, title, description, type } = req.body;

    if (subject_id) {
      const subject = await prisma.subject.findUnique({
        where: { id: subject_id },
        select: { teacherId: true },
      });
      if (!subject) return res.status(404).json({ error: 'Subject not found' });
      if (req.user.role !== 'admin' && subject.teacherId !== req.user.id) {
        return res.status(403).json({ error: 'You can only create boards for subjects you teach' });
      }
    } else if (room_id && req.user.role !== 'admin') {
      const teacherRoom = await prisma.teacherRoom.findUnique({
        where: { teacherId_roomId: { teacherId: req.user.id, roomId: room_id } },
      });
      if (!teacherRoom) {
        return res.status(403).json({ error: 'You can only create boards for rooms you teach' });
      }
    } else if (!subject_id && !room_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'A board must be tied to a subject or room' });
    }

    const board = await prisma.discussionBoard.create({
      data: {
        subjectId: subject_id || null,
        roomId: room_id || null,
        targetUserId: req.body.target_user_id || null,
        title,
        description,
        type: type || 'general',
        createdBy: req.user.id,
      },
    });
    ok(res, board, 201);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/boards/subject/:subjectId
router.get('/boards/subject/:subjectId', async (req, res) => {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: req.params.subjectId },
      select: { id: true, teacherId: true, roomId: true },
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const isTeacher = req.user.role === 'teacher' && subject.teacherId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isStudent = req.user.role === 'student' && (await isStudentInRoom(req.user.id, subject.roomId));
    if (!isTeacher && !isAdmin && !isStudent) {
      return res.status(403).json({ error: 'You do not have access to this subject' });
    }

    const boards = await prisma.discussionBoard.findMany({
      where: { subjectId: req.params.subjectId },
      include: {
        _count: { select: { threads: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    ok(res, boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/boards — boards the current user can see
router.get('/boards', async (req, res) => {
  try {
    const where = await getAccessibleBoardWhere(req.user);
    const boards = await prisma.discussionBoard.findMany({
      where,
      include: {
        _count: { select: { threads: true } },
        subject: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    ok(res, boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discussions/boards/find-or-create — specialized boards for teachers
router.post('/boards/find-or-create', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { type, roomId, targetUserId } = req.body;

    let where = { type };
    if (type === 'personal') {
      if (!targetUserId) return res.status(400).json({ error: 'targetUserId required for personal boards' });
      where = {
        type: 'personal',
        OR: [
          { createdBy: req.user.id, targetUserId },
          { createdBy: targetUserId, targetUserId: req.user.id }
        ]
      };
    } else if (type === 'class' || type === 'class_parents') {
      if (!roomId) return res.status(400).json({ error: 'roomId required' });
      where = { type, roomId };
    } else {
      return res.status(400).json({ error: 'Invalid board type for find-or-create' });
    }

    let board = await prisma.discussionBoard.findFirst({ 
      where,
      include: { room: { select: { name: true } } }
    });

    if (!board) {
      let title = '';
      let description = '';

      if (type === 'personal') {
        const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true, role: true } });
        title = `Discussion: ${req.user.name} & ${target.name}`;
        description = `Private conversation between ${req.user.role} and ${target.role}`;
      } else if (type === 'class' || type === 'class_parents') {
        const room = await prisma.room.findUnique({ where: { id: roomId }, select: { name: true } });
        title = type === 'class' ? `${room.name} Discussion` : `${room.name} Parents Board`;
        description = type === 'class' ? `General discussion for all students in ${room.name}` : `Coordination board for parents of students in ${room.name}`;
      }

      board = await prisma.discussionBoard.create({
        data: {
          type,
          roomId: roomId || null,
          targetUserId: targetUserId || null,
          title,
          description,
          createdBy: req.user.id,
        },
        include: { room: { select: { name: true } } }
      });
    }

    ok(res, board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/boards/:boardId
router.get('/boards/:boardId', async (req, res) => {
  try {
    const access = await assertBoardAccess(req.params.boardId, req.user);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

    const board = await prisma.discussionBoard.findFirst({
      where: { id: req.params.boardId },
      include: {
        subject: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    ok(res, board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/boards/:boardId/threads
router.get('/boards/:boardId/threads', async (req, res) => {
  try {
    const access = await assertBoardAccess(req.params.boardId, req.user);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

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

    ok(res, { threads: enriched, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discussions/boards/:boardId/threads
router.post('/boards/:boardId/threads', validate(createThreadSchema), async (req, res) => {
  try {
    const access = await assertBoardAccess(req.params.boardId, req.user);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });
    if (access.board.isLocked) return res.status(403).json({ error: 'Board is locked' });

    const { title, body } = req.body;
    const thread = await prisma.discussionThread.create({
      data: {
        boardId: req.params.boardId,
        authorId: req.user.id,
        title: title.trim(),
        body: sanitizeHtml(body),
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    Promise.resolve().then(async () => {
      if (req.user.role === 'student') {
        await awardXP(req.user.id, 10, 'discussion_thread');
        await checkAndAwardBadges(req.user.id, 'discussion_participation');
      }
    });

    ok(res, thread, 201);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discussions/threads/:threadId
router.get('/threads/:threadId', async (req, res) => {
  try {
    const t = await prisma.discussionThread.findUnique({
      where: { id: req.params.threadId },
      select: { boardId: true },
    });
    if (!t) return res.status(404).json({ error: 'Thread not found' });

    const access = await assertBoardAccess(t.boardId, req.user);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

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

    ok(res, enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discussions/threads/:threadId/replies
router.post('/threads/:threadId/replies', validate(createReplySchema), async (req, res) => {
  try {
    const thread = await prisma.discussionThread.findFirst({
      where: { id: req.params.threadId },
      include: { author: true },
    });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (thread.isLocked) return res.status(403).json({ error: 'Thread is locked' });

    const access = await assertBoardAccess(thread.boardId, req.user);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

    const { body, parent_reply_id } = req.body;
    const reply = await prisma.discussionReply.create({
      data: {
        threadId: req.params.threadId,
        parentReplyId: parent_reply_id || null,
        authorId: req.user.id,
        body: sanitizeHtml(body),
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    Promise.resolve().then(async () => {
      if (thread.authorId !== req.user.id) {
        await prisma.notification.create({
          data: {
            recipientId: thread.authorId,
            type: 'discussion_reply',
            title: `New reply on your thread "${thread.title}"`,
            body: `${req.user.name} replied to your discussion.`,
          },
        });
      }
      if (req.user.role === 'student') {
        await awardXP(req.user.id, 8, 'discussion_reply');
        await checkAndAwardBadges(req.user.id, 'discussion_participation');
      }
    });

    ok(res, reply, 201);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discussions/replies/:replyId/upvote
router.put('/replies/:replyId/upvote', async (req, res) => {
  try {
    const reply = await prisma.discussionReply.findUnique({
      where: { id: req.params.replyId },
      include: { thread: { select: { boardId: true } } },
    });
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const access = await assertBoardAccess(reply.thread.boardId, req.user);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

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
      return ok(res, { upvoted: false });
    }

    await prisma.replyUpvote.create({
      data: { userId: req.user.id, replyId: req.params.replyId },
    });
    const updated = await prisma.discussionReply.update({
      where: { id: req.params.replyId },
      data: { upvotes: { increment: 1 } },
      include: { author: { select: { id: true } } },
    });

    Promise.resolve().then(async () => {
      if (updated.authorId !== req.user.id) {
        await awardXP(updated.authorId, 5, 'discussion_upvote_received');
        await prisma.notification.create({
          data: {
            recipientId: updated.authorId,
            type: 'discussion_upvote',
            title: 'Your reply was upvoted! 👍',
            body: `${req.user.name} upvoted your reply.`,
          },
        });
      }
    });

    ok(res, { upvoted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discussions/replies/:replyId/accept — only the subject teacher (or admin)
router.put('/replies/:replyId/accept', async (req, res) => {
  try {
    const reply = await prisma.discussionReply.findUnique({
      where: { id: req.params.replyId },
      include: { thread: { select: { boardId: true, title: true } } },
    });
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const access = await assertBoardAccess(reply.thread.boardId, req.user, { requireModerator: true });
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

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
          recipientId: reply.authorId,
          type: 'answer_accepted',
          title: 'Your answer was accepted! ✅',
          body: `Your reply in "${reply.thread.title}" was marked as the accepted answer.`,
        },
      });
    }

    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discussions/threads/:threadId/pin — moderator only
router.put('/threads/:threadId/pin', async (req, res) => {
  try {
    const thread = await prisma.discussionThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const access = await assertBoardAccess(thread.boardId, req.user, { requireModerator: true });
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

    const updated = await prisma.discussionThread.update({
      where: { id: req.params.threadId },
      data: { isPinned: !thread.isPinned },
    });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discussions/threads/:threadId/lock — moderator only
router.put('/threads/:threadId/lock', async (req, res) => {
  try {
    const thread = await prisma.discussionThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const access = await assertBoardAccess(thread.boardId, req.user, { requireModerator: true });
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

    const updated = await prisma.discussionThread.update({
      where: { id: req.params.threadId },
      data: { isLocked: !thread.isLocked },
    });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discussions/threads/:threadId — author or moderator
router.delete('/threads/:threadId', async (req, res) => {
  try {
    const thread = await prisma.discussionThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const access = await assertBoardAccess(thread.boardId, req.user);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

    if (thread.authorId !== req.user.id && !access.isModerator) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.discussionThread.delete({ where: { id: req.params.threadId } });
    ok(res, { message: 'Thread deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discussions/replies/:replyId — author or moderator
router.delete('/replies/:replyId', async (req, res) => {
  try {
    const reply = await prisma.discussionReply.findUnique({
      where: { id: req.params.replyId },
      include: { thread: { select: { boardId: true } } },
    });
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const access = await assertBoardAccess(reply.thread.boardId, req.user);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

    if (reply.authorId !== req.user.id && !access.isModerator) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.discussionReply.delete({ where: { id: req.params.replyId } });
    ok(res, { message: 'Reply deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
