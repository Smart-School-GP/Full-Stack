const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const { validateResourceOwnership } = require('../middleware/schoolValidation');
const validate = require('../middleware/validate');
const { createSubmissionSchema, feedbackSchema } = require('../schemas/submissions.schemas');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { upload, uploadToCloudinary } = require('../services/fileUpload');
const { v4: uuidv4 } = require('uuid');

const prisma = require("../lib/prisma");

router.use(authenticate);

router.get('/student/assignments/pending', requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user.id;

    const studentClasses = await prisma.studentClass.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            subjects: {
              include: {
                assignments: {
                  where: {
                    OR: [
                      { dueDate: { gte: new Date() } },
                      { dueDate: null },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    });

    const assignments = [];
    for (const sc of studentClasses) {
      for (const subject of sc.class.subjects) {
        for (const assignment of subject.assignments) {
          const submission = await prisma.submission.findUnique({
            where: {
              assignmentId_studentId: {
                assignmentId: assignment.id,
                studentId,
              },
            },
          });

          assignments.push({
            ...assignment,
            subject: { id: subject.id, name: subject.name },
            class: { id: sc.class.id, name: sc.class.name },
            submission: submission || null,
          });
        }
      }
    }

    const pending = assignments.filter((a) => !a.submission);

    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('student'), validate(createSubmissionSchema), async (req, res) => {
  try {
    const { assignment_id, text_response, file_url, file_name, file_type } = req.body;
    const studentId = req.user.id;

    if (!assignment_id) {
      return res.status(400).json({ error: 'assignment_id required' });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignment_id },
      include: { subject: true },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const isEnrolled = await prisma.studentClass.findFirst({
      where: {
        studentId,
        class: { subjects: { some: { id: assignment.subjectId } } },
      },
    });

    if (!isEnrolled) {
      return res.status(403).json({ error: 'Not enrolled in this class' });
    }

    const existing = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment_id,
          studentId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already submitted' });
    }

    let status = 'submitted';
    if (assignment.dueDate && new Date() > assignment.dueDate) {
      status = 'late';
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId: assignment_id,
        studentId,
        textResponse: text_response,
        fileUrl: file_url,
        fileName: file_name,
        fileType: file_type,
        status,
      },
    });

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/file', requireRole('student'), uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    const { assignment_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignment_id },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      `submissions/${assignment_id}`,
      `${req.user.id}_${uuidv4()}`
    );

    let status = 'submitted';
    if (assignment.dueDate && new Date() > assignment.dueDate) {
      status = 'late';
    }

    const existing = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment_id,
          studentId: req.user.id,
        },
      },
    });

    if (existing) {
      const updated = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          fileUrl: result.secure_url,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          status,
        },
      });
      return res.json(updated);
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId: assignment_id,
        studentId: req.user.id,
        fileUrl: result.secure_url,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        status,
      },
    });

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/teacher/assignments/:assignmentId/submissions', requireRole('teacher', 'admin'), validateResourceOwnership('assignment'), async (req, res) => {

  try {
    const { assignmentId } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { subject: { include: { class: true } } },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      assignment,
      submissions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:submissionId/feedback', requireRole('teacher', 'admin'), validateResourceOwnership('submission'), validate(feedbackSchema), async (req, res) => {

  try {
    const { submissionId } = req.params;
    const { feedback, score } = req.body;

    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        feedback,
        score,
        status: score !== undefined ? 'graded' : 'submitted',
      },
      include: {
        student: { select: { id: true, name: true } },
        assignment: { select: { title: true } },
      },
    });

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/student/submissions', requireRole('student'), async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { studentId: req.user.id },
      include: {
        assignment: {
          include: { subject: { select: { name: true } } },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
