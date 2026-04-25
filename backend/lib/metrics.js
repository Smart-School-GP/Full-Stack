const client = require('prom-client');

// Initialize default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ prefix: 'school_backend_' });

// Custom HTTP request duration histogram
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

module.exports = {
  client,
  httpRequestDurationMicroseconds
};
