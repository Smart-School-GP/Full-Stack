const { z } = require('zod');

const createSubmissionSchema = z.object({
  assignment_id: z.string().min(1, 'assignment_id is required'),
  text_response: z.string().max(10000).optional(),
  file_url: z.string().url().optional(),
  file_name: z.string().max(255).optional(),
  file_type: z.string().max(100).optional(),
});

const feedbackSchema = z.object({
  feedback: z.string().max(2000).optional(),
  score: z.number().min(0).max(10000).optional(),
});

module.exports = { createSubmissionSchema, feedbackSchema };
