const axios = require('axios');

/**
 * Creates a Daily.co video room for a meeting.
 * Falls back to a mock URL if no API key is configured (dev mode).
 */
async function createMeetingRoom(meetingId, durationMinutes = 30) {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    // Dev mode — return a mock room URL using Daily's public demo
    console.warn('[VideoService] DAILY_API_KEY not set — using mock room URL');
    return `https://demo.daily.co/mock-meeting-${meetingId}`;
  }

  try {
    // Room expires 1 hour after the meeting duration ends
    const expiryTime = Math.floor(Date.now() / 1000) + durationMinutes * 60 + 3600;

    const response = await axios.post(
      'https://api.daily.co/v1/rooms',
      {
        name: `meeting-${meetingId}`,
        properties: {
          exp: expiryTime,
          max_participants: 2,
          enable_chat: true,
          enable_screenshare: false,
          enable_knocking: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.url;
  } catch (err) {
    console.error('[VideoService] Failed to create Daily.co room:', err.response?.data || err.message);
    throw new Error('Failed to create video room');
  }
}

/**
 * Deletes a Daily.co room (on cancellation).
 */
async function deleteMeetingRoom(roomName) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey || !roomName) return;

  try {
    await axios.delete(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (err) {
    console.warn('[VideoService] Could not delete room:', err.message);
  }
}

module.exports = { createMeetingRoom, deleteMeetingRoom };
