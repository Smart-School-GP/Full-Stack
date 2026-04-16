const { z } = require('zod');

const ASSIGNMENT_TYPES = ['homework', 'quiz', 'exam', 'project', 'classwork'];
const SUBMISSION_TYPES = ['online', 'physical', 'both'];

exports.createSubjectSchema = z.object({
  class_id: z.string().uuid('class_id must be a valid UUID'),
  name: z.string().min(1, 'subject name is required').max(100),
});

exports.createAssignmentSchema = z.object({
  subject_id: z.string().uuid('subject_id must be a valid UUID'),
  title: z.string().min(1, 'title is required').max(200),
  type: z.enum(ASSIGNMENT_TYPES, {
    errorMap: () => ({ message: `type must be one of: ${ASSIGNMENT_TYPES.join(', ')}` }),
  }),
  max_score: z.number().int().min(1).max(1000).optional().default(100),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  submission_type: z
    .enum(SUBMISSION_TYPES, {
      errorMap: () => ({ message: `submission_type must be one of: ${SUBMISSION_TYPES.join(', ')}` }),
    })
    .optional()
    .default('both'),
  instructions: z.string().max(2000).optional().nullable(),
});

exports.updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  max_score: z.number().int().min(1).max(1000).optional(),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  submission_type: z.enum(SUBMISSION_TYPES).optional(),
  instructions: z.string().max(2000).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

exports.enterGradeSchema = z.object({
  student_id: z.string().uuid('student_id must be a valid UUID'),
  assignment_id: z.string().uuid('assignment_id must be a valid UUID'),
  score: z.number().min(0, 'score must be >= 0'),
});

exports.updateGradeSchema = z.object({
  score: z.number().min(0, 'score must be >= 0'),
});

exports.gradingWeightsSchema = z.object({
  weights: z
    .record(z.string(), z.number().min(0).max(100))
    .refine(
      (w) => {
        const total = Object.values(w).reduce((sum, v) => sum + v, 0);
        return Math.abs(total - 100) < 0.01;
      },
      { message: 'Weights must sum to 100' }
    ),
});
