const { z } = require('zod');

const createPortfolioItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['image', 'document', 'link', 'video', 'project', 'essay', 'artwork', 'certificate', 'achievement', 'other'], {
    errorMap: () => ({ message: 'Invalid type.' }),
  }),
  subjectId: z.string().uuid().optional().or(z.literal('')),
  isPublic: z.union([z.boolean(), z.enum(['true', 'false'])]).optional().transform((v) => v === true || v === 'true'),
});

const updatePortfolioItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(2000).optional(),
  isPublic: z.union([z.boolean(), z.enum(['true', 'false'])]).optional().transform((v) => v === true || v === 'true'),
  subjectId: z.string().uuid().optional().or(z.literal('')),
  type: z.enum(['image', 'document', 'link', 'video', 'project', 'essay', 'artwork', 'certificate', 'achievement', 'other']).optional(),
});

module.exports = {
  createPortfolioItemSchema,
  updatePortfolioItemSchema,
};
