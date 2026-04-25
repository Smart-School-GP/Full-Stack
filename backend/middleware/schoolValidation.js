/**
 * Resource Existence Validation Middleware
 *
 * Validates that resources referenced in route params or request bodies actually
 * exist before reaching the route handler. Returns 404 on missing IDs to provide
 * a uniform "not found or access denied" response across the API.
 *
 * Usage:
 *   const { validateResourceOwnership } = require('./middleware/schoolValidation');
 *   router.get('/students/:studentId', authenticate, validateResourceOwnership('student'), handler);
 *   router.post('/attendance', authenticate, validateResourceOwnership(['student', 'room']), handler);
 */

const prisma = require('../lib/prisma');

/**
 * Map of resource types to their Prisma model and ID field names
 */
const RESOURCE_MODELS = {
  student: { model: 'user', field: 'id', role: 'student' },
  teacher: { model: 'user', field: 'id', role: 'teacher' },
  parent: { model: 'user', field: 'id', role: 'parent' },
  admin: { model: 'user', field: 'id', role: 'admin' },
  owner: { model: 'user', field: 'id', role: 'owner' },
  user: { model: 'user', field: 'id' },
  room: { model: 'room', field: 'id' },
  subject: { model: 'subject', field: 'id' },
  assignment: { model: 'assignment', field: 'id' },
  attendance: { model: 'attendance', field: 'id' },
  submission: { model: 'submission', field: 'id' },
  meeting: { model: 'meeting', field: 'id' },
  announcement: { model: 'announcement', field: 'id' },
  notification: { model: 'notification', field: 'id' },
  portfolio: { model: 'portfolioItem', field: 'id' },
  timetableSlot: { model: 'timetableSlot', field: 'id' },
  timetablePeriod: { model: 'timetablePeriod', field: 'id' },
  event: { model: 'schoolEvent', field: 'id' },
  learningPath: { model: 'learningPath', field: 'id' },
  discussionBoard: { model: 'discussionBoard', field: 'id' },
  discussionThread: { model: 'discussionThread', field: 'id' },
  badge: { model: 'badgeDefinition', field: 'id' },
};

/**
 * Create middleware that validates each named resource exists.
 * @param {string|string[]} resourceTypes - Resource type(s) to validate
 * @param {string} idParam - Route parameter name (default: `${type}Id`)
 * @returns {Function} Express middleware
 */
function validateResourceOwnership(resourceTypes, idParam) {
  const types = Array.isArray(resourceTypes) ? resourceTypes : [resourceTypes];

  return async (req, res, next) => {
    try {
      for (const type of types) {
        const config = RESOURCE_MODELS[type];
        if (!config) {
          console.warn(`[ResourceValidation] Unknown resource type: ${type}`);
          continue;
        }

        // Determine which ID to check from request parameters
        const paramName = idParam || `${type}Id`;
        const resourceId = req.params[paramName] || req.body[`${type}_id`] || req.body[`${type}Id`];
        
        if (!resourceId) {
          // If no ID provided, skip this validation (may be optional)
          continue;
        }

        // Build query based on resource type
        const where = {};
        
        if (config.model === 'user') {
          where.id = resourceId;
          if (config.role) {
            where.role = config.role;
          }
        } else if (config.model === 'room') {
          where.id = resourceId;
        } else if (config.model === 'subject') {
          where.id = resourceId;
        } else if (config.model === 'assignment') {
          const assignment = await prisma.assignment.findFirst({
            where: { id: resourceId },
            select: { id: true },
          });
          
          if (!assignment) {
            return res.status(404).json({ error: `Assignment not found or access denied` });
          }
          continue;
        } else if (config.model === 'submission') {
          const submission = await prisma.submission.findFirst({
            where: { id: resourceId },
            select: { id: true },
          });
          
          if (!submission) {
            return res.status(404).json({ error: `Submission not found or access denied` });
          }
          continue;
        } else if (config.model === 'attendance') {
          where.id = resourceId;
        } else if (config.model === 'meeting') {
          where.id = resourceId;
        } else if (config.model === 'announcement') {
          where.id = resourceId;
        } else if (config.model === 'notification') {
          where.id = resourceId;
        } else if (config.model === 'portfolioItem') {
          where.id = resourceId;
        } else if (config.model === 'timetableSlot') {
          where.id = resourceId;
        } else if (config.model === 'timetablePeriod') {
          where.id = resourceId;
        } else if (config.model === 'schoolEvent') {
          where.id = resourceId;
        } else if (config.model === 'learningPath') {
          where.id = resourceId;
        } else if (config.model === 'discussionBoard') {
          where.id = resourceId;
        } else if (config.model === 'discussionThread') {
          const thread = await prisma.discussionThread.findFirst({
            where: { id: resourceId },
            select: { id: true },
          });
          
          if (!thread) {
            return res.status(404).json({ error: `Thread not found or access denied` });
          }
          continue;
        } else if (config.model === 'badgeDefinition') {
          where.id = resourceId;
        }

        if (Object.keys(where).length > 0) {
          const prismaModel = prisma[config.model];
          const resource = await prismaModel.findFirst({
            where,
            select: { [config.field]: true },
          });

          if (!resource) {
            return res.status(404).json({ 
              error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found or access denied` 
            });
          }
        }
      }

      next();
    } catch (err) {
      console.error('[ResourceValidation] Error:', err.message);
      return res.status(500).json({
        error: 'Internal server error during validation'
      });
    }
  };
}

/**
 * Validate that a student is enrolled in a given room.
 * @param {string} studentIdParam - Parameter name for student ID
 * @param {string} roomIdParam - Parameter name for room ID
 */
function validateStudentInRoom(studentIdParam = 'studentId', roomIdParam = 'roomId') {
  return async (req, res, next) => {
    const studentId = req.params[studentIdParam] || req.body.student_id;
    const roomId = req.params[roomIdParam] || req.body.room_id;

    if (!studentId || !roomId) {
      return res.status(400).json({ 
        error: 'Missing required parameters' 
      });
    }

    try {
      const enrollment = await prisma.studentRoom.findFirst({
        where: {
          studentId,
          roomId,
        },
        select: { studentId: true },
      });

      if (!enrollment) {
        return res.status(403).json({ 
          error: 'Student not enrolled in this room' 
        });
      }

      next();
    } catch (err) {
      console.error('[ResourceValidation] Error validating student in room:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Validate that a teacher is assigned to a given room.
 */
function validateTeacherInRoom(teacherIdParam = 'teacherId', roomIdParam = 'roomId') {
  return async (req, res, next) => {
    const teacherId = req.params[teacherIdParam] || req.body.teacher_id;
    const roomId = req.params[roomIdParam] || req.body.room_id;

    if (!teacherId || !roomId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const assignment = await prisma.teacherRoom.findFirst({
        where: {
          teacherId,
          roomId,
        },
        select: { teacherId: true },
      });

      if (!assignment) {
        return res.status(403).json({ error: 'Teacher not assigned to this room' });
      }

      next();
    } catch (err) {
      console.error('[ResourceValidation] Error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = {
  validateResourceOwnership,
  validateStudentInRoom,
  validateTeacherInRoom,
  RESOURCE_MODELS,
};