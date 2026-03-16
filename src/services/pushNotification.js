const admin = require('firebase-admin');

let isInitialized = false;

function initializeFirebase() {
  if (isInitialized) return;
  
  if (
    process.env.FCM_PROJECT_ID &&
    process.env.FCM_CLIENT_EMAIL &&
    process.env.FCM_PRIVATE_KEY
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FCM_PROJECT_ID,
        clientEmail: process.env.FCM_CLIENT_EMAIL,
        privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    isInitialized = true;
  }
}

async function sendPushNotification(userId, title, body, data = {}) {
  if (!isInitialized) {
    initializeFirebase();
  }
  
  if (!isInitialized) {
    console.log('Firebase not configured, skipping push notification');
    return null;
  }

  
  const prisma = require("../lib/prisma");

  try {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) {
      console.log(`No device tokens for user ${userId}`);
      return null;
    }

    const messages = tokens.map((t) => ({
      token: t.token,
      notification: { title, body },
      data: { ...data, userId },
    }));

    const responses = await Promise.all(
      messages.map((msg) => admin.messaging().send(msg))
    );

    return responses;
  } catch (error) {
    console.error('Push notification error:', error);
    return null;
  } finally {

  }
}

async function sendToMultipleUsers(userIds, title, body, data = {}) {
  const promises = userIds.map((userId) =>
    sendPushNotification(userId, title, body, data)
  );
  return Promise.all(promises);
}

module.exports = {
  initializeFirebase,
  sendPushNotification,
  sendToMultipleUsers,
  admin,
};
