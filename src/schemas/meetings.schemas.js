const { z } = require('zod');

const createMeetingSchema = z.object({
  parent_id: z.string().min(1, 'parent_id is required'),
  student_id: z.string().min(1, 'student_id is required'),
  scheduled_at: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'scheduled_at must be a valid date' }),
  duration_minutes: z.number().int().min(5).max(240).optional(),
  notes: z.string().max(1000).optional(),
});

const updateMeetingSchema = z.object({
  scheduled_at: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'scheduled_at must be a valid date' }).optional(),
  duration_minutes: z.number().int().min(5).max(240).optional(),
  notes: z.string().max(1000).optional(),
});

const meetingStatusSchema = z.object({
  status: z.enum(['scheduled', 'cancelled', 'completed'], {
    errorMap: () => ({ message: 'Invalid status. Allowed: scheduled, cancelled, completed' }),
  }),
});

module.exports = { createMeetingSchema, updateMeetingSchema, meetingStatusSchema };
