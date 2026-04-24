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
      logger.warn('Slow database query detected', {
        query: e.query,
        params: e.params,
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
