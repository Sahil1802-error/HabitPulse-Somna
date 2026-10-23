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
    const { habitId, date, value, notes } = req.body || {};
    if (!habitId || !date) {
      return res.status(400).json({ success: false, error: 'habitId and date are required' });
    }

    const log = db.toggleHabitLog(habitId, date, value, notes);
    return res.status(200).json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
