/**
 * Vision Attendance Routes
 * Proxies to the Python AI service for face registration and identification,
 * then automatically creates attendance records in the database.
 *
 * POST /api/vision/register/:studentId   — upload a photo to register a student's face
 * POST /api/vision/mark/:classId         — upload a class photo to auto-mark attendance
 * GET  /api/vision/registry              — list registered students
 * DELETE /api/vision/registry/:studentId — remove a student's face encoding
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../services/fileUpload');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8002';

router.use(authenticate);

/**
 * POST /api/vision/register/:studentId
 * Teacher uploads a photo to register a student's face.
 */
router.post(
  '/register/:studentId',
  requireRole('teacher', 'admin'),
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'photo file is required' });
      }

      // Verify student belongs to this school
      const student = await prisma.user.findFirst({
        where: { id: req.params.studentId, schoolId: req.user.school_id, role: 'student' },
        select: { id: true, name: true },
      });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Forward to Python AI service
      const form = new FormData();
      form.append('student_id', req.params.studentId);
      form.append('photo', req.file.buffer, {
        filename: req.file.originalname || 'photo.jpg',
        contentType: req.file.mimetype,
      });

      const aiRes = await axios.post(`${AI_SERVICE_URL}/vision/register`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      logger.info('vision:register', {
        actorId: req.user.id,
        studentId: req.params.studentId,
        studentName: student.name,
        result: aiRes.data,
      });

      res.json({
        ...aiRes.data,
        student_name: student.name,
      });
    } catch (err) {
      if (err.response) {
        return res.status(err.response.status).json({ error: err.response.data?.detail || 'AI service error' });
      }
      logger.error('vision:register:error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/vision/mark/:classId
 * Teacher uploads a class photo. The AI service identifies faces and Express
 * automatically creates attendance records for matched students.
 */
router.post(
  '/mark/:classId',
  requireRole('teacher', 'admin'),
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'photo file is required' });
      }

      // Verify class belongs to this school
      const cls = await prisma.class.findFirst({
        where: { id: req.params.classId, schoolId: req.user.school_id },
        include: {
          students: { select: { studentId: true } },
        },
      });
      if (!cls) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Forward to AI service for face identification
      const form = new FormData();
      form.append('photo', req.file.buffer, {
        filename: req.file.originalname || 'class_photo.jpg',
        contentType: req.file.mimetype,
      });

      const aiRes = await axios.post(`${AI_SERVICE_URL}/vision/identify`, form, {
        headers: form.getHeaders(),
        timeout: 60000, // class photos take longer
      });

      const { matches, faces_detected } = aiRes.data;
      const classStudentIds = new Set(cls.students.map((s) => s.studentId));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendanceResults = [];
      const matchedStudentIds = new Set();

      // Create attendance records for recognized students
      for (const match of matches) {
        if (match.matched && match.student_id && classStudentIds.has(match.student_id)) {
          matchedStudentIds.add(match.student_id);

          try {
            await prisma.attendance.upsert({
              where: {
                studentId_classId_date: {
                  studentId: match.student_id,
                  classId: req.params.classId,
                  date: today,
                },
              },
              create: {
                schoolId: req.user.school_id,
                studentId: match.student_id,
                classId: req.params.classId,
                date: today,
                status: 'present',
                markedBy: req.user.id,
                note: `Auto-marked via computer vision (confidence: ${(match.confidence * 100).toFixed(1)}%)`,
              },
              update: {
                status: 'present',
                markedBy: req.user.id,
                note: `Auto-marked via computer vision (confidence: ${(match.confidence * 100).toFixed(1)}%)`,
              },
            });
            attendanceResults.push({ student_id: match.student_id, status: 'present', confidence: match.confidence });
          } catch (dbErr) {
            logger.error('vision:attendance:db_error', { studentId: match.student_id, error: dbErr.message });
          }
        }
      }

      // Mark unrecognized class students as absent
      const absentStudentIds = [...classStudentIds].filter((id) => !matchedStudentIds.has(id));
      for (const studentId of absentStudentIds) {
        try {
          await prisma.attendance.upsert({
            where: { studentId_classId_date: { studentId, classId: req.params.classId, date: today } },
            create: {
              schoolId: req.user.school_id,
              studentId,
              classId: req.params.classId,
              date: today,
              status: 'absent',
              markedBy: req.user.id,
              note: 'Not detected in class photo',
            },
            update: {
              status: 'absent',
              markedBy: req.user.id,
              note: 'Not detected in class photo',
            },
          });
          attendanceResults.push({ student_id: studentId, status: 'absent', confidence: 0 });
        } catch (dbErr) {
          logger.error('vision:attendance:absent:db_error', { studentId, error: dbErr.message });
        }
      }

      logger.info('vision:mark_attendance', {
        actorId: req.user.id,
        classId: req.params.classId,
        faces_detected,
        present_count: matchedStudentIds.size,
        absent_count: absentStudentIds.length,
      });

      res.json({
        success: true,
        faces_detected,
        present_count: matchedStudentIds.size,
        absent_count: absentStudentIds.length,
        attendance: attendanceResults,
        ai_response: aiRes.data,
      });
    } catch (err) {
      if (err.response) {
        return res.status(err.response.status).json({ error: err.response.data?.detail || 'AI service error' });
      }
      logger.error('vision:mark:error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/vision/registry
 * List all registered student IDs in the face registry.
 */
router.get('/registry', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const aiRes = await axios.get(`${AI_SERVICE_URL}/vision/registry`, { timeout: 5000 });
    res.json(aiRes.data);
  } catch (err) {
    res.status(503).json({ error: 'AI service unavailable' });
  }
});

/**
 * DELETE /api/vision/registry/:studentId
 * Remove a student's face encodings.
 */
router.delete('/registry/:studentId', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const aiRes = await axios.delete(
      `${AI_SERVICE_URL}/vision/registry/${req.params.studentId}`,
      { timeout: 5000 }
    );
    res.json(aiRes.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Student not found in registry' });
    }
    res.status(503).json({ error: 'AI service unavailable' });
  }
});

module.exports = router;
