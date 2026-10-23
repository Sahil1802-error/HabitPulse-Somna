const db = require('./_db.js');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const action = url.searchParams.get('action') || (req.body && req.body.action);

    // 1. Sign Up
    if (action === 'signup' && req.method === 'POST') {
      const { name, email, password } = req.body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }
      const result = db.registerUser(name, email, password);
      return res.status(201).json({ success: true, ...result });
    }

    // 2. Login
    if (action === 'login' && req.method === 'POST') {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }
      const result = db.authenticateUser(email, password);
      return res.status(200).json({ success: true, ...result });
    }

    // 3. Current User Profile
    if (action === 'me' && req.method === 'GET') {
      const userId = db.getUserIdFromRequest(req);
      if (!userId || userId === 'u-demo') {
        return res.status(401).json({ success: false, error: 'Not authenticated.' });
      }
      const user = db.getUserById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found on active server instance.' });
      }
      return res.status(200).json({ success: true, user });
    }

    // 4. Restore Account (Resilient recovery for serverless cold starts)
    if (action === 'restore_account' && req.method === 'POST') {
      const { name, email, password, data } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required for recovery.' });
      }
      const result = db.restoreOrRegisterUser(name || 'User', email, password, data);
      return res.status(200).json({ success: true, ...result });
    }

    // 5. Restore Session (Silent recovery when opening browser)
    if (action === 'restore_session' && req.method === 'POST') {
      const { userId, name, email, data } = req.body || {};
      if (!userId || !email) {
        return res.status(400).json({ success: false, error: 'userId and email required.' });
      }
      const result = db.restoreSession(userId, name, email, data);
      return res.status(200).json({ success: true, ...result });
    }

    // 6. Sync User Data
    if (action === 'sync' && req.method === 'POST') {
      const userId = db.getUserIdFromRequest(req);
      const data = db.syncUserData(userId, req.body);
      return res.status(200).json({ success: true, data });
    }

    return res.status(400).json({ success: false, error: 'Invalid auth action.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};
