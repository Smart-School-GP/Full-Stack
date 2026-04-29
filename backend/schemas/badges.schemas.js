const { z } = require('zod');

const createBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  iconEmoji: z.string().max(10).optional(),
  icon_emoji: z.string().max(10).optional(),
  iconUrl: z.string().url().optional(),
  icon_url: z.string().url().optional(),
  color: z.string().max(20).optional(),
  criteriaType: z.string().min(1).optional(),
  criteria_type: z.string().min(1).optional(),
  criteriaValue: z.number().optional(),
  criteria_value: z.number().optional(),
  pointsValue: z.number().int().min(0).optional(),
  points_value: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const updateBadgeSchema = createBadgeSchema.partial();

const awardBadgeSchema = z.object({
  student_id: z.string().min(1, 'student_id is required'),
  badge_id: z.string().min(1, 'badge_id is required'),
  note: z.string().max(500).optional(),
});

module.exports = { createBadgeSchema, updateBadgeSchema, awardBadgeSchema };
