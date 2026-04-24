const { z } = require('zod');

const createConversationSchema = z.object({
  parent_id: z.string().min(1, 'parent_id is required'),
  student_id: z.string().min(1, 'student_id is required'),
});

const sendMessageSchema = z.object({
  body: z.string().max(5000).optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().optional(),
}).refine((d) => d.body || d.attachmentUrl, { message: 'body or attachmentUrl required' });

module.exports = { createConversationSchema, sendMessageSchema };
