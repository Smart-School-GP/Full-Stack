const { z } = require('zod');

const unlockConditions = ['sequential', 'free', 'score_based'];
const itemTypes = ['lesson', 'assignment', 'video', 'file', 'link', 'quiz'];

const createPathSchema = z.object({
  subject_id: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
});

const updatePathSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  is_published: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
});

const createModuleSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  order_index: z.number().int().min(0).optional(),
  unlock_condition: z.enum(unlockConditions).optional(),
  min_score_to_unlock: z.number().min(0).max(100).optional().nullable(),
});

const updateModuleSchema = createModuleSchema.partial();

const reorderModulesSchema = z.object({
  modules: z.array(
    z.object({
      id: z.string().min(1),
      order_index: z.number().int().min(0),
    })
  ).min(1),
});

const createItemSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(itemTypes),
  content: z.string().max(100000).optional().nullable(),
  file_url: z.string().url().max(500).optional().nullable(),
  external_url: z.string().url().max(500).optional().nullable(),
  order_index: z.number().int().min(0).optional(),
  is_required: z.boolean().optional(),
  points: z.number().int().min(0).optional(),
});

const updateItemSchema = createItemSchema.partial();

const reorderItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      order_index: z.number().int().min(0),
    })
  ).min(1),
});

const completeItemSchema = z.object({
  score: z.number().min(0).max(100).optional().nullable(),
});

module.exports = {
  createPathSchema,
  updatePathSchema,
  createModuleSchema,
  updateModuleSchema,
  reorderModulesSchema,
  createItemSchema,
  updateItemSchema,
  reorderItemsSchema,
  completeItemSchema,
};
