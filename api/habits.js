const db = require('./_db.js');

module.exports = function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const id = url.searchParams.get('id') || (req.body && req.body.id);

    if (req.method === 'GET') {
      const habits = db.getHabits();
      return res.status(200).json({ success: true, data: habits });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.title) {
        return res.status(400).json({ success: false, error: 'Title is required' });
      }
      const newHabit = db.createHabit(body);
      return res.status(201).json({ success: true, data: newHabit });
    }

    if (req.method === 'PUT') {
      if (!id) {
        return res.status(400).json({ success: false, error: 'Habit ID is required' });
      }
      const updated = db.updateHabit(id, req.body || {});
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Habit not found' });
      }
      return res.status(200).json({ success: true, data: updated });
    }

    if (req.method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ success: false, error: 'Habit ID is required' });
      }
      db.deleteHabit(id);
      return res.status(200).json({ success: true, message: 'Habit deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
