const db = require('./_db.js');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const id = url.searchParams.get('id') || url.searchParams.get('date');
    const userId = db.getUserIdFromRequest(req);

    if (req.method === 'GET') {
      const logs = db.getSleepLogs(userId, startDate, endDate);
      return res.status(200).json({ success: true, data: logs });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.date) {
        return res.status(400).json({ success: false, error: 'Sleep date is required' });
      }
      const saved = db.saveSleepLog(userId, body);
      return res.status(200).json({ success: true, data: saved });
    }

    if (req.method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ success: false, error: 'id or date is required to delete' });
      }
      db.deleteSleepLog(userId, id);
      return res.status(200).json({ success: true, message: 'Sleep log deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
