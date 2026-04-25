const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const { sendPushNotification } = require('../services/pushNotification');

const prisma = require("../lib/prisma");

let _sanitizeBody;
try {
  const DOMPurify = require('isomorphic-dompurify');
  _sanitizeBody = (text) => DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'br', 'p', 'a', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
} catch {
  _sanitizeBody = (text) => text;
}

function sanitizeBody(text) {
  if (!text) return text;
  return _sanitizeBody(text);
}

const VALID_AUDIENCES = ['all', 'teachers', 'parents', 'students', 'subject', 'room', 'custom'];
const NOTIFY_BATCH_LIMIT = 200;

router.use(authenticate);

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getTeacherScope(teacherId) {
  const subjects = await prisma.subject.findMany({
    where: { teacherId },
    select: { id: true, roomId: true },
  });
  const teacherRooms = await prisma.teacherRoom.findMany({
    where: { teacherId },
    select: { roomId: true },
  });

  const subjectIds = new Set(subjects.map((s) => s.id));
  const roomIds = new Set([
    ...subjects.map((s) => s.roomId),
    ...teacherRooms.map((t) => t.roomId),
  ]);

  return { subjectIds, roomIds };
}

async function resolveRecipientIds(announcement) {
  // Returns the set of user IDs that should be notified for an announcement.
  // Used at create time to push notifications and (optionally) materialize
  // the audience for downstream consumers.
  const { audience, subjectId, roomId, id } = announcement;

  if (audience === 'all') {
    const users = await prisma.user.findMany({
      where: { role: { in: ['teacher', 'parent', 'student'] }, isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (audience === 'teachers' || audience === 'parents' || audience === 'students') {
    const role = audience.slice(0, -1);
    const users = await prisma.user.findMany({
      where: { role, isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (audience === 'subject') {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        teacherId: true,
        roomId: true,
        room: {
          select: {
            students: { select: { studentId: true } },
            teachers: { select: { teacherId: true } },
          },
        },
      },
    });
    if (!subject) return [];
    const studentIds = subject.room.students.map((s) => s.studentId);
    const teacherIds = [
      ...subject.room.teachers.map((t) => t.teacherId),
      ...(subject.teacherId ? [subject.teacherId] : []),
    ];
    const parents = await prisma.parentStudent.findMany({
      where: { studentId: { in: studentIds } },
      select: { parentId: true },
    });
    return Array.from(new Set([...studentIds, ...teacherIds, ...parents.map((p) => p.parentId)]));
  }

  if (audience === 'room') {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        students: { select: { studentId: true } },
        teachers: { select: { teacherId: true } },
        subjects: { select: { teacherId: true } },
      },
    });
    if (!room) return [];
    const studentIds = room.students.map((s) => s.studentId);
    const teacherIds = [
      ...room.teachers.map((t) => t.teacherId),
      ...room.subjects.map((s) => s.teacherId).filter(Boolean),
    ];
    const parents = await prisma.parentStudent.findMany({
      where: { studentId: { in: studentIds } },
      select: { parentId: true },
    });
    return Array.from(new Set([...studentIds, ...teacherIds, ...parents.map((p) => p.parentId)]));
  }

  if (audience === 'custom') {
    const recipients = await prisma.announcementRecipient.findMany({
      where: { announcementId: id },
      select: { userId: true },
    });
    return recipients.map((r) => r.userId);
  }

  return [];
}

async function buildVisibilityFilter(user) {
  // Translates "what this user is allowed to see" into a Prisma `where` fragment.
  if (user.role === 'admin') {
    return {};
  }

  const roleAudience = `${user.role}s`;
  const visibility = [
    { audience: 'all' },
    { audience: roleAudience },
    { audience: 'custom', recipients: { some: { userId: user.id } } },
  ];

  if (user.role === 'student') {
    const rooms = await prisma.studentRoom.findMany({
      where: { studentId: user.id },
      select: { roomId: true },
    });
    const roomIds = rooms.map((r) => r.roomId);
    if (roomIds.length > 0) {
      const subjects = await prisma.subject.findMany({
        where: { roomId: { in: roomIds } },
        select: { id: true },
      });
      visibility.push({ audience: 'room', roomId: { in: roomIds } });
      if (subjects.length > 0) {
        visibility.push({ audience: 'subject', subjectId: { in: subjects.map((s) => s.id) } });
      }
    }
  }

  if (user.role === 'teacher') {
    const { subjectIds, roomIds } = await getTeacherScope(user.id);
    if (roomIds.size > 0) {
      visibility.push({ audience: 'room', roomId: { in: [...roomIds] } });
    }
    if (subjectIds.size > 0) {
      visibility.push({ audience: 'subject', subjectId: { in: [...subjectIds] } });
    }
  }

  if (user.role === 'parent') {
    const links = await prisma.parentStudent.findMany({
      where: { parentId: user.id },
      select: { studentId: true },
    });
    const studentIds = links.map((l) => l.studentId);
    if (studentIds.length > 0) {
      const studentRooms = await prisma.studentRoom.findMany({
        where: { studentId: { in: studentIds } },
        select: { roomId: true },
      });
      const roomIds = [...new Set(studentRooms.map((r) => r.roomId))];
      if (roomIds.length > 0) {
        visibility.push({ audience: 'room', roomId: { in: roomIds } });
        const subjects = await prisma.subject.findMany({
          where: { roomId: { in: roomIds } },
          select: { id: true },
        });
        if (subjects.length > 0) {
          visibility.push({ audience: 'subject', subjectId: { in: subjects.map((s) => s.id) } });
        }
      }
    }
  }

  return { OR: visibility };
}

async function validateCreatePayload(req, payload) {
  const { title, body, audience, subject_id, room_id, recipient_ids } = payload;

  if (!title || !body || !audience) {
    return { error: 'title, body, and audience are required' };
  }
  if (!VALID_AUDIENCES.includes(audience)) {
    return { error: `audience must be one of: ${VALID_AUDIENCES.join(', ')}` };
  }

  if (audience === 'subject') {
    if (!subject_id) return { error: 'subject_id is required for subject audience' };
    const subject = await prisma.subject.findUnique({
      where: { id: subject_id },
      select: { id: true, teacherId: true },
    });
    if (!subject) return { error: 'Subject not found' };
    if (req.user.role === 'teacher' && subject.teacherId !== req.user.id) {
      return { error: 'You are not assigned to this subject' };
    }
  }

  if (audience === 'room') {
    if (!room_id) return { error: 'room_id is required for room audience' };
    const room = await prisma.room.findUnique({ where: { id: room_id }, select: { id: true } });
    if (!room) return { error: 'Room not found' };
    if (req.user.role === 'teacher') {
      const { roomIds } = await getTeacherScope(req.user.id);
      if (!roomIds.has(room_id)) {
        return { error: 'You do not teach in this room' };
      }
    }
  }

  if (audience === 'custom') {
    if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return { error: 'recipient_ids (non-empty array) required for custom audience' };
    }
    const users = await prisma.user.findMany({
      where: { id: { in: recipient_ids }, isActive: true },
      select: { id: true, role: true },
    });
    if (users.length !== recipient_ids.length) {
      return { error: 'One or more recipients not found or inactive' };
    }
    if (req.user.role === 'teacher') {
      const { subjectIds, roomIds } = await getTeacherScope(req.user.id);
      const allowedUsers = await collectTeacherAddressableUserIds(req.user.id, subjectIds, roomIds);
      const outOfScope = recipient_ids.filter((id) => !allowedUsers.has(id));
      if (outOfScope.length > 0) {
        return { error: 'Some recipients are outside your teaching scope' };
      }
    }
  }

  if (req.user.role === 'teacher' && (audience === 'all' || audience === 'teachers' || audience === 'parents' || audience === 'students')) {
    return { error: 'Teachers can only target a subject, room, or specific users' };
  }

  return { ok: true };
}

async function collectTeacherAddressableUserIds(teacherId, subjectIds, roomIds) {
  // Computes the union of every user a teacher is allowed to direct-message:
  // students enrolled in their rooms, fellow teachers in those rooms, and
  // parents of those students. Used to gate the custom-audience picker.
  const allowed = new Set([teacherId]);
  if (roomIds.size === 0 && subjectIds.size === 0) return allowed;

  const roomIdArr = [...roomIds];
  if (roomIdArr.length > 0) {
    const studentRooms = await prisma.studentRoom.findMany({
      where: { roomId: { in: roomIdArr } },
      select: { studentId: true },
    });
    const studentIds = studentRooms.map((r) => r.studentId);
    studentIds.forEach((id) => allowed.add(id));

    const teacherRooms = await prisma.teacherRoom.findMany({
      where: { roomId: { in: roomIdArr } },
      select: { teacherId: true },
    });
    teacherRooms.forEach((t) => allowed.add(t.teacherId));

    if (studentIds.length > 0) {
      const parents = await prisma.parentStudent.findMany({
        where: { studentId: { in: studentIds } },
        select: { parentId: true },
      });
      parents.forEach((p) => allowed.add(p.parentId));
    }
  }

  return allowed;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

router.get('/targets', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const [subjects, rooms, users] = await Promise.all([
        prisma.subject.findMany({
          select: { id: true, name: true, room: { select: { id: true, name: true } } },
          orderBy: { name: 'asc' },
        }),
        prisma.room.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        prisma.user.findMany({
          where: { isActive: true, role: { in: ['teacher', 'parent', 'student'] } },
          select: { id: true, name: true, role: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      return res.json({ success: true, data: { subjects, rooms, users } });
    }

    // Teacher scope only
    const { subjectIds, roomIds } = await getTeacherScope(req.user.id);
    const [subjects, rooms] = await Promise.all([
      prisma.subject.findMany({
        where: { id: { in: [...subjectIds] } },
        select: { id: true, name: true, room: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.room.findMany({
        where: { id: { in: [...roomIds] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const allowedUserIds = await collectTeacherAddressableUserIds(req.user.id, subjectIds, roomIds);
    allowedUserIds.delete(req.user.id);
    const users = await prisma.user.findMany({
      where: { id: { in: [...allowedUserIds] }, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: { subjects, rooms, users } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const payload = req.body;
    const validation = await validateCreatePayload(req, payload);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      title,
      body,
      audience,
      pinned,
      expires_at,
      category,
      subject_id,
      room_id,
      recipient_ids,
    } = payload;

    const announcement = await prisma.announcement.create({
      data: {
        createdBy: req.user.id,
        title,
        body: sanitizeBody(body),
        audience,
        category: category || 'general',
        subjectId: audience === 'subject' ? subject_id : null,
        roomId: audience === 'room' ? room_id : null,
        pinned: !!pinned,
        expiresAt: expires_at ? new Date(expires_at) : null,
        ...(audience === 'custom' && {
          recipients: {
            createMany: {
              data: recipient_ids.map((userId) => ({ userId })),
              skipDuplicates: true,
            },
          },
        }),
      },
    });

    const recipientIds = await resolveRecipientIds(announcement);
    const targets = recipientIds.filter((id) => id !== req.user.id).slice(0, NOTIFY_BATCH_LIMIT);
    await Promise.allSettled(
      targets.map((userId) =>
        sendPushNotification(userId, title, body.substring(0, 100), {
          type: 'announcement',
          announcementId: announcement.id,
        })
      )
    );

    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const visibility = await buildVisibilityFilter(req.user);

    const where = {
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ...(Object.keys(visibility).length > 0 ? [visibility] : []),
      ],
    };

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        subject: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        reads: { where: { userId: req.user.id }, select: { readAt: true } },
        _count: { select: { reads: true, recipients: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    const data = announcements.map(({ reads, ...a }) => ({
      ...a,
      isRead: reads.length > 0,
      isMine: a.createdBy === req.user.id,
    }));

    res.json({ success: true, data });
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
        creator: { select: { id: true, name: true, role: true } },
        subject: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        recipients: {
          select: { user: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Visibility check for non-admins
    if (req.user.role !== 'admin' && announcement.createdBy !== req.user.id) {
      const visibility = await buildVisibilityFilter(req.user);
      const visible = await prisma.announcement.findFirst({
        where: { AND: [{ id: announcementId }, visibility] },
        select: { id: true },
      });
      if (!visible) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: { announcementId, userId: req.user.id },
      },
      create: { announcementId, userId: req.user.id },
      update: { readAt: new Date() },
    });

    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:announcementId', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { announcementId } = req.params;
    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    if (req.user.role === 'teacher' && existing.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own announcements' });
    }

    const { title, body, pinned, expires_at, category } = req.body;

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title: title ?? existing.title,
        body: body ? sanitizeBody(body) : existing.body,
        pinned: pinned !== undefined ? !!pinned : existing.pinned,
        expiresAt: expires_at !== undefined
          ? (expires_at ? new Date(expires_at) : null)
          : existing.expiresAt,
        category: category ?? existing.category,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:announcementId', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { announcementId } = req.params;
    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    if (req.user.role === 'teacher' && existing.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own announcements' });
    }

    await prisma.announcement.delete({ where: { id: announcementId } });

    res.json({ success: true, data: { message: 'Announcement deleted' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:announcementId/reads', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { announcementId } = req.params;
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true, createdBy: true, audience: true, subjectId: true, roomId: true },
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    if (req.user.role === 'teacher' && announcement.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const reads = await prisma.announcementRead.findMany({
      where: { announcementId },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    const expectedRecipients = await resolveRecipientIds(announcement);
    const total = expectedRecipients.length;

    res.json({
      success: true,
      data: {
        totalRead: reads.length,
        totalUsers: total,
        percentage: total > 0 ? (reads.length / total) * 100 : 0,
        reads,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
