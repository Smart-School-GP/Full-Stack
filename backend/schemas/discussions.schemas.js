const { z } = require('zod');

const boardTypes = ['general', 'qa', 'debate', 'announcement'];

const createBoardSchema = z.object({
  subject_id: z.string().min(1).optional().nullable(),
  room_id: z.string().min(1).optional().nullable(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(boardTypes).optional(),
});

const createThreadSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(50000),
});

const createReplySchema = z.object({
  body: z.string().min(1).max(50000),
  parent_reply_id: z.string().min(1).optional().nullable(),
});

module.exports = {
  createBoardSchema,
  createThreadSchema,
  createReplySchema,
};
