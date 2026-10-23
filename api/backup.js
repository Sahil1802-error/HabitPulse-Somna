const db = require('./_db.js');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const userId = db.getUserIdFromRequest(req);

    if (req.method === 'GET') {
      const data = db.getUserData(userId);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const backupData = req.body;
      if (!backupData || !backupData.habits || !Array.isArray(backupData.habits)) {
        return res.status(400).json({ success: false, error: 'Invalid backup format' });
      }
      db.syncUserData(userId, backupData);
      return res.status(200).json({ success: true, message: 'Backup restored successfully' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
