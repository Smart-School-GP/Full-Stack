const { z } = require('zod');

const createPeriodSchema = z.object({
  name: z.string().min(1).max(100),
  start_time: z.string().min(1, 'start_time is required'),
  end_time: z.string().min(1, 'end_time is required'),
  period_number: z.number().int().min(1),
});

const updatePeriodSchema = createPeriodSchema.partial();

const createSlotSchema = z.object({
  class_id: z.string().min(1, 'class_id is required'),
  subject_id: z.string().min(1, 'subject_id is required'),
  period_id: z.string().min(1, 'period_id is required'),
  day_of_week: z.number().int().min(0).max(6),
  effective_from: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'effective_from must be a valid date' }),
  teacher_id: z.string().optional(),
  room: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
});

module.exports = { createPeriodSchema, updatePeriodSchema, createSlotSchema };
