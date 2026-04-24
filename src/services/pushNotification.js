const admin = require('firebase-admin');
const Sentry = require('@sentry/node');
const logger = require('../lib/logger');
const prisma = require('../lib/prisma');

let isInitialized = false;
let initializationFailed = false;

/**
 * Initialize Firebase Admin SDK for push notifications
 * Called lazily on first use
 */
function initializeFirebase() {
  if (isInitialized || initializationFailed) return;
  
  if (
    process.env.FCM_PROJECT_ID &&
    process.env.FCM_CLIENT_EMAIL &&
    process.env.FCM_PRIVATE_KEY
  ) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FCM_PROJECT_ID,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      isInitialized = true;
      logger.info('[Push] Firebase initialized successfully');
    } catch (initError) {
      logger.error('[Push] Firebase initialization failed', { error: initError.message });
      initializationFailed = true;
    }
  } else {
    logger.info('[Push] Firebase not configured, push notifications disabled');
    initializationFailed = true;
  }
}

/**
 * Send push notification to a single user
 * Gracefully handles failures - returns null instead of throwing
 */
async function sendPushNotification(userId, title, body, data = {}) {
  if (!isInitialized) {
    initializeFirebase();
  }
  
  if (!isInitialized) {
    logger.debug('[Push] Firebase not available, skipping');
    return null;
  }

  try {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) {
      logger.debug('[Push] No device tokens for user', { userId });
      return null;
    }

    const messages = tokens.map((t) => ({
      token: t.token,
      notification: { title, body },
      data: { ...data, userId },
    }));

    // Send individually to handle partial failures
    const results = await Promise.allSettled(
      messages.map((msg) => admin.messaging().send(msg))
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    if (successful < messages.length) {
      logger.warn('[Push] Some messages failed to send', {
        userId,
        successful,
        total: messages.length,
      });
      // Capture to Sentry but don't block
      if (process.env.SENTRY_DSN) {
        Sentry.captureMessage(`Partial push failure for user ${userId}`, 'warning');
      }
    }

    return results;
  } catch (error) {
    // Don't throw - just log and return null
    logger.warn('[Push] Notification error', { error: error.message, userId });
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(`Push notification failed: ${error.message}`, 'warning');
    }
    return null;
  }
}

/**
 * Send push notifications to multiple users
 * Non-blocking - failures are logged but don't throw
 */
async function sendToMultipleUsers(userIds, title, body, data = {}) {
  const promises = userIds.map((userId) =>
    sendPushNotification(userId, title, body, data)
  );
  // Use allSettled to not fail fast
  return Promise.allSettled(promises);
}

/**
 * Check if Firebase/FCM is available
 */
function isPushAvailable() {
  return isInitialized;
}

module.exports = {
  initializeFirebase,
  sendPushNotification,
  sendToMultipleUsers,
  isPushAvailable,
  admin,
};
