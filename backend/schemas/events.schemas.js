const { z } = require('zod');

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  event_type: z.string().min(1).max(50),
  start_date: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'start_date must be a valid date' }),
  end_date: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'end_date must be a valid date' }),
  affects_rooms: z.array(z.string()).optional(),
  color: z.string().max(20).optional(),
});

const updateEventSchema = createEventSchema.partial();

module.exports = { createEventSchema, updateEventSchema };
