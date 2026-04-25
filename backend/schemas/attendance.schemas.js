const { z } = require('zod');

const markAttendanceSchema = z.object({
  room_id: z.string().uuid(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  records: z.array(z.object({
    student_id: z.string().uuid(),
    status: z.enum(['present', 'absent', 'late', 'excused']),
    note: z.string().optional(),
  })).min(1),
});

const updateAttendanceSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']),
  note: z.string().optional(),
});

module.exports = {
  markAttendanceSchema,
  updateAttendanceSchema,
};
