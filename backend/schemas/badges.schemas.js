const { z } = require('zod');

// Helper to coerce string to number
const coercedNumber = z.preprocess((val) => {
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  }
  return val;
}, z.number());

// Helper to coerce string to boolean
const coercedBoolean = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
  }
  return val;
}, z.boolean());

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
  criteriaValue: coercedNumber.optional(),
  criteria_value: coercedNumber.optional(),
  pointsValue: coercedNumber.optional(),
  points_value: coercedNumber.optional(),
  isActive: coercedBoolean.optional(),
  is_active: coercedBoolean.optional(),
});

const updateBadgeSchema = createBadgeSchema.partial();

const awardBadgeSchema = z.object({
  student_id: z.string().min(1, 'student_id is required'),
  badge_id: z.string().min(1, 'badge_id is required'),
  note: z.string().max(500).optional(),
});

module.exports = { createBadgeSchema, updateBadgeSchema, awardBadgeSchema };
