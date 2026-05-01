const adminService = require('../backend/services/adminService');

async function main() {
  const userId = '0fe34931-eb9b-46a6-be38-16d604cde3a2';
  try {
    const result = await adminService.deleteUser(userId);
    console.log('Delete result:', result);
  } catch (err) {
    console.error('Delete failed:', err);
  }
}

main().catch(console.error);
