const { v4: uuidv4 } = require('uuid');

/**
 * Attach a unique requestId to every incoming request.
 * Clients may supply X-Request-ID; otherwise one is generated.
 * The id is echoed back in the response header for client-side correlation.
 */
function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

module.exports = requestId;
