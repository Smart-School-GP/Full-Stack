const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const SLOW_QUERY_THRESHOLD_MS = 100;

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
    ],
  });

  client.$on('query', (e) => {
    if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
      const truncatedParams = e.params.length > 500 ? e.params.substring(0, 500) + '...' : e.params;
      const truncatedQuery = e.query.length > 500 ? e.query.substring(0, 500) + '...' : e.query;
      
      logger.warn('Slow database query detected', {
        query: truncatedQuery,
        params: truncatedParams,
        durationMs: e.duration,
      });
    }
  });

  client.$on('error', (e) => {
    logger.error('Prisma client error', { message: e.message });
  });

  return client;
}

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient();
  }
  prisma = global.prisma;
}

module.exports = prisma;
