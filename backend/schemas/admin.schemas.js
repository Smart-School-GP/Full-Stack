const { z } = require('zod');

const VALID_ROLES = ['teacher', 'parent', 'student', 'admin'];

const baseUserFields = {
  name: z.string().min(1, 'name is required').max(100),
  email: z.string().email('must be a valid email address'),
  password: z.string().min(8, 'password must be at least 8 characters'),
};

// A single subject assignment for a teacher: either pick an existing subject
// (subject_id) inside a room, or create a new one (name) in a room.
const subjectAssignmentSchema = z
  .object({
    room_id: z.string().uuid('room_id must be a valid UUID'),
    subject_id: z.string().uuid('subject_id must be a valid UUID').optional(),
    name: z.string().min(1).max(100).optional(),
  })
  .refine((d) => Boolean(d.subject_id) !== Boolean(d.name), {
    message: 'Provide exactly one of subject_id or name',
  });

const teacherCreateSchema = z.object({
  ...baseUserFields,
  role: z.literal('teacher'),
  assignments: z
    .object({
      room_ids: z.array(z.string().uuid('room_id must be a valid UUID')).default([]),
      subjects: z.array(subjectAssignmentSchema).default([]),
    })
    .default({ room_ids: [], subjects: [] }),
});

const studentCreateSchema = z.object({
  ...baseUserFields,
  role: z.literal('student'),
  assignments: z
    .object({
      room_ids: z.array(z.string().uuid('room_id must be a valid UUID')).default([]),
      parent_ids: z.array(z.string().uuid('parent_id must be a valid UUID')).default([]),
    })
    .default({ room_ids: [], parent_ids: [] }),
});

const parentCreateSchema = z.object({
  ...baseUserFields,
  role: z.literal('parent'),
  assignments: z
    .object({
      student_ids: z.array(z.string().uuid('student_id must be a valid UUID')).default([]),
    })
    .default({ student_ids: [] }),
});

const adminCreateSchema = z.object({
  ...baseUserFields,
  role: z.literal('admin'),
});

exports.createUserSchema = z.discriminatedUnion('role', [
  teacherCreateSchema,
  studentCreateSchema,
  parentCreateSchema,
  adminCreateSchema,
], {
  errorMap: (issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_union_discriminator) {
      return { message: `role must be one of: ${VALID_ROLES.join(', ')}` };
    }
    return { message: ctx.defaultError };
  },
});

exports.createRoomSchema = z.object({
  name: z.string().min(1, 'room name is required').max(100),
  grade_level: z.string().max(20).optional(),
});

exports.enrollStudentSchema = z.object({
  student_id: z.string().uuid('student_id must be a valid UUID'),
});

exports.assignTeacherSchema = z.object({
  teacher_id: z.string().uuid('teacher_id must be a valid UUID'),
});

exports.createSubjectSchema = z.object({
  name: z.string().min(1, 'subject name is required').max(100),
  teacher_id: z.string().uuid('teacher_id must be a valid UUID').optional().nullable(),
});

exports.updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  teacher_id: z.string().uuid('teacher_id must be a valid UUID').nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
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
