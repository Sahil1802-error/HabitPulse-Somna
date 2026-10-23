const db = require('./_db.js');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const freshData = db.getDefaultData();
    db.saveDatabase(freshData);
    return res.status(200).json({ success: true, message: 'Database reset and seeded with 35 days of history' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
