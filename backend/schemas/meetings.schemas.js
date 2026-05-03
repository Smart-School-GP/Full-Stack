const { z } = require('zod');

const createMeetingSchema = z.object({
  parent_ids: z.array(z.string()).min(1, 'At least one parent is required'),
  student_ids: z.array(z.string()).min(1, 'At least one student is required'),
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
