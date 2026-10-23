// API Client with User Authentication and Local/Cloud Sync
const API = {
  baseUrl: '',

  getToken() {
    return localStorage.getItem('hs_auth_token') || '';
  },

  getUser() {
    try {
      const u = localStorage.getItem('hs_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  setAuth(token, user) {
    if (token) localStorage.setItem('hs_auth_token', token);
    if (user) localStorage.setItem('hs_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('hs_auth_token');
    localStorage.removeItem('hs_user');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      },
      ...options
    };

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, config);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`API call failed for ${endpoint}:`, err.message);
      throw err;
    }
  },

  // ----------------- Authentication -----------------
  async signup(name, email, password) {
    const res = await this.request('/api/auth?action=signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    if (res.token && res.user) {
      this.setAuth(res.token, res.user);
    }
    return res;
  },

  async login(email, password) {
    const res = await this.request('/api/auth?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token && res.user) {
      this.setAuth(res.token, res.user);
    }
    return res;
  },

  async getMe() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await this.request('/api/auth?action=me');
      if (res.user) {
        this.setAuth(token, res.user);
      }
      return res.user;
    } catch (e) {
      this.clearAuth();
      return null;
    }
  },

  logout() {
    this.clearAuth();
  },

  async syncUserData(payload) {
    return this.request('/api/auth?action=sync', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // ----------------- Tracking & Analytics -----------------
  async getDailyAnalytics(date) {
    return this.request(`/api/analytics?view=daily&date=${date}`);
  },

  async getWeeklyAnalytics(date) {
    return this.request(`/api/analytics?view=weekly&date=${date}`);
  },

  async getMonthlyAnalytics(year, month) {
    return this.request(`/api/analytics?view=monthly&year=${year}&month=${month}`);
  },

  async getInsights() {
    return this.request('/api/insights');
  },

  async toggleHabit(habitId, date, value, notes) {
    return this.request('/api/habit-toggle', {
      method: 'POST',
      body: JSON.stringify({ habitId, date, value, notes })
    });
  },

  async createHabit(habitData) {
    return this.request('/api/habits', {
      method: 'POST',
      body: JSON.stringify(habitData)
    });
  },

  async updateHabit(id, habitData) {
    return this.request(`/api/habits?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...habitData })
    });
  },

  async deleteHabit(id) {
    return this.request(`/api/habits?id=${id}`, {
      method: 'DELETE'
    });
  },

  async saveSleep(sleepData) {
    return this.request('/api/sleep', {
      method: 'POST',
      body: JSON.stringify(sleepData)
    });
  },

  async seedData() {
    return this.request('/api/seed', {
      method: 'POST'
    });
  },

  async exportBackup() {
    return this.request('/api/backup');
  },

  async importBackup(data) {
    return this.request('/api/backup', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
