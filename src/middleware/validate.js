const { ZodError } = require('zod');
const { ValidationError } = require('../lib/errors');

/**
 * Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/users', validate(createUserSchema), handler);
 *
 * The schema should be a Zod object that describes req.body.
 * Query params and path params can also be validated by passing an object:
 *   validate({ body: bodySchema, query: querySchema, params: paramsSchema })
 */
function validate(schemaOrShapes) {
  // Support both: validate(z.object({...})) and validate({ body, query, params })
  const shapes =
    schemaOrShapes && typeof schemaOrShapes.parse === 'function'
      ? { body: schemaOrShapes }
      : schemaOrShapes;

  return (req, res, next) => {
    try {
      if (shapes.body) req.body = shapes.body.parse(req.body);
      if (shapes.query) req.query = shapes.query.parse(req.query);
      if (shapes.params) req.params = shapes.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(new ValidationError('Validation failed', details));
      }
      next(err);
    }
  };
}

module.exports = validate;
