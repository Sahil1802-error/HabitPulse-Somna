const db = require('./_db.js');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const view = url.searchParams.get('view') || 'daily';
    const date = url.searchParams.get('date');
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');

    if (view === 'daily') {
      const data = db.getDailyAnalytics(date);
      return res.status(200).json({ success: true, view: 'daily', data });
    }

    if (view === 'weekly') {
      const data = db.getWeeklyAnalytics(date);
      return res.status(200).json({ success: true, view: 'weekly', data });
    }

    if (view === 'monthly') {
      const data = db.getMonthlyAnalytics(year, month);
      return res.status(200).json({ success: true, view: 'monthly', data });
    }

    return res.status(400).json({ success: false, error: 'Invalid view parameter. Use daily, weekly, or monthly.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
