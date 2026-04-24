/**
 * Resource-Level School Validation Middleware
 * 
 * Validates that resources accessed via route parameters belong to the user's school.
 * This provides defense-in-depth beyond the requireSchool() middleware which only
 * validates schoolId in the request body/params.
 * 
 * Usage:
 *   const { validateResourceOwnership } = require('./middleware/schoolValidation');
 *   
 *   // Validate specific resource types
 *   router.get('/students/:studentId', authenticate, validateResourceOwnership('student'), handler);
 *   
 *   // Or validate multiple at once
 *   router.post('/attendance', authenticate, validateResourceOwnership(['student', 'class']), handler);
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
  class: { model: 'class', field: 'id' },
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
 * Create middleware to validate resource belongs to user's school
 * @param {string|string[]} resourceTypes - Resource type(s) to validate
 * @param {string} idParam - Route parameter name (default: extracted from resource type)
 * @returns {Function} Express middleware
 */
function validateResourceOwnership(resourceTypes, idParam) {
  const types = Array.isArray(resourceTypes) ? resourceTypes : [resourceTypes];

  return async (req, res, next) => {
    const schoolId = req.user.school_id;
    
    if (!schoolId) {
      return res.status(403).json({ 
        error: 'Forbidden: No school context' 
      });
    }

    try {
      for (const type of types) {
        const config = RESOURCE_MODELS[type];
        if (!config) {
          console.warn(`[SchoolValidation] Unknown resource type: ${type}`);
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
          where.schoolId = schoolId;
          if (config.role) {
            where.role = config.role;
          }
        } else if (config.model === 'class') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'subject') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'assignment') {
          // Assignment belongs to subject, which belongs to class, which belongs to school
          const assignment = await prisma.assignment.findFirst({
            where: { 
              id: resourceId,
              subject: { 
                class: { schoolId } 
              } 
            },
            select: { id: true },
          });
          
          if (!assignment) {
            return res.status(404).json({ 
              error: `Assignment not found or access denied` 
            });
          }
          continue;
        } else if (config.model === 'submission') {
          const submission = await prisma.submission.findFirst({
            where: { 
              id: resourceId,
              student: { schoolId }
            },
            select: { id: true },
          });
          
          if (!submission) {
            return res.status(404).json({ 
              error: `Submission not found or access denied` 
            });
          }
          continue;
        } else if (config.model === 'attendance') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'meeting') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'announcement') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'notification') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'portfolioItem') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'timetableSlot') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'timetablePeriod') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'schoolEvent') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'learningPath') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'discussionBoard') {
          where.id = resourceId;
          where.schoolId = schoolId;
        } else if (config.model === 'discussionThread') {
          // Thread belongs to board, which belongs to school
          const thread = await prisma.discussionThread.findFirst({
            where: { 
              id: resourceId,
              board: { schoolId }
            },
            select: { id: true },
          });
          
          if (!thread) {
            return res.status(404).json({ 
              error: `Thread not found or access denied` 
            });
          }
          continue;
        } else if (config.model === 'badgeDefinition') {
          where.id = resourceId;
          where.schoolId = schoolId;
        }

        // For models with direct schoolId field
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
      console.error('[SchoolValidation] Error:', err.message);
      return res.status(500).json({ 
        error: 'Internal server error during validation' 
      });
    }
  };
}

/**
 * Validate that a student belongs to a class within the user's school
 * @param {string} studentIdParam - Parameter name for student ID
 * @param {string} classIdParam - Parameter name for class ID
 */
function validateStudentInClass(studentIdParam = 'studentId', classIdParam = 'classId') {
  return async (req, res, next) => {
    const studentId = req.params[studentIdParam] || req.body.student_id;
    const classId = req.params[classIdParam] || req.body.class_id;
    const schoolId = req.user.school_id;

    if (!studentId || !classId) {
      return res.status(400).json({ 
        error: 'Missing required parameters' 
      });
    }

    try {
      const enrollment = await prisma.studentClass.findFirst({
        where: {
          studentId,
          classId,
          class: { schoolId },
        },
        select: { studentId: true },
      });

      if (!enrollment) {
        return res.status(403).json({ 
          error: 'Student not enrolled in this class' 
        });
      }

      next();
    } catch (err) {
      console.error('[SchoolValidation] Error validating student in class:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Validate teacher is assigned to a class within the user's school
 */
function validateTeacherInClass(teacherIdParam = 'teacherId', classIdParam = 'classId') {
  return async (req, res, next) => {
    const teacherId = req.params[teacherIdParam] || req.body.teacher_id;
    const classId = req.params[classIdParam] || req.body.class_id;
    const schoolId = req.user.school_id;

    if (!teacherId || !classId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const assignment = await prisma.teacherClass.findFirst({
        where: {
          teacherId,
          classId,
          class: { schoolId },
        },
        select: { teacherId: true },
      });

      if (!assignment) {
        return res.status(403).json({ error: 'Teacher not assigned to this class' });
      }

      next();
    } catch (err) {
      console.error('[SchoolValidation] Error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = {
  validateResourceOwnership,
  validateStudentInClass,
  validateTeacherInClass,
  RESOURCE_MODELS,
};