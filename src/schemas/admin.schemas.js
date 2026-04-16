const { z } = require('zod');

const VALID_ROLES = ['teacher', 'parent', 'student', 'admin'];

exports.createUserSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  email: z.string().email('must be a valid email address'),
  password: z.string().min(8, 'password must be at least 8 characters'),
  role: z.enum(VALID_ROLES, {
    errorMap: () => ({ message: `role must be one of: ${VALID_ROLES.join(', ')}` }),
  }),
});

exports.createClassSchema = z.object({
  name: z.string().min(1, 'class name is required').max(100),
  grade_level: z.string().max(20).optional(),
});

exports.enrollStudentSchema = z.object({
  student_id: z.string().uuid('student_id must be a valid UUID'),
});

exports.assignTeacherSchema = z.object({
  teacher_id: z.string().uuid('teacher_id must be a valid UUID'),
});

exports.linkParentStudentSchema = z.object({
  parent_id: z.string().uuid('parent_id must be a valid UUID'),
  student_id: z.string().uuid('student_id must be a valid UUID'),
});

exports.updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(VALID_ROLES).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});
