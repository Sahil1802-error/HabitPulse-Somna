// API Client with Resilient User Authentication and Client-Side Vault
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
    if (user) {
      localStorage.setItem('hs_user', JSON.stringify(user));
      this.recordInVault(user);
    }
  },

  clearAuth() {
    localStorage.removeItem('hs_auth_token');
    localStorage.removeItem('hs_user');
  },

  // Record user account metadata in local device vault
  recordInVault(user) {
    if (!user || !user.email) return;
    try {
      const vault = JSON.parse(localStorage.getItem('hs_vault_accounts') || '[]');
      const cleanEmail = user.email.toLowerCase().trim();
      const existingIdx = vault.findIndex(u => u.email.toLowerCase() === cleanEmail);
      const entry = {
        id: user.id,
        name: user.name || 'User',
        email: cleanEmail,
        lastSeen: new Date().toISOString()
      };
      if (existingIdx !== -1) {
        vault[existingIdx] = { ...vault[existingIdx], ...entry };
      } else {
        vault.push(entry);
      }
      localStorage.setItem('hs_vault_accounts', JSON.stringify(vault));
    } catch (e) {}
  },

  findInVault(email) {
    try {
      const vault = JSON.parse(localStorage.getItem('hs_vault_accounts') || '[]');
      const cleanEmail = (email || '').toLowerCase().trim();
      return vault.find(u => u.email.toLowerCase() === cleanEmail) || null;
    } catch (e) {
      return null;
    }
  },

  getCachedUserData(userId) {
    try {
      const raw = localStorage.getItem(`hs_user_data_${userId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
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
    try {
      // 1. First attempt: standard server login
      const res = await this.request('/api/auth?action=login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.token && res.user) {
        this.setAuth(res.token, res.user);
      }
      return res;
    } catch (err) {
      // 2. Fallback: If server restarted / cold-started and forgot the user account in memory
      const vaultUser = this.findInVault(email);
      if (vaultUser) {
        const cachedData = this.getCachedUserData(vaultUser.id);
        try {
          const recoveryRes = await this.request('/api/auth?action=restore_account', {
            method: 'POST',
            body: JSON.stringify({
              name: vaultUser.name,
              email: vaultUser.email,
              password,
              data: cachedData
            })
          });
          if (recoveryRes.token && recoveryRes.user) {
            this.setAuth(recoveryRes.token, recoveryRes.user);
            return recoveryRes;
          }
        } catch (recoverErr) {
          throw new Error(recoverErr.message || 'Invalid email or password.');
        }
      }
      throw err;
    }
  },

  async getMe() {
    const token = this.getToken();
    const cachedUser = this.getUser();
    if (!token && !cachedUser) return null;

    try {
      const res = await this.request('/api/auth?action=me');
      if (res.user) {
        this.setAuth(token, res.user);
        return res.user;
      }
    } catch (e) {
      // If server cold-started, attempt silent session restoration using local vault
      if (cachedUser && cachedUser.id) {
        try {
          const cachedData = this.getCachedUserData(cachedUser.id);
          const restoreRes = await this.request('/api/auth?action=restore_session', {
            method: 'POST',
            body: JSON.stringify({
              userId: cachedUser.id,
              name: cachedUser.name,
              email: cachedUser.email,
              data: cachedData
            })
          });
          if (restoreRes.token && restoreRes.user) {
            this.setAuth(restoreRes.token, restoreRes.user);
            return restoreRes.user;
          }
        } catch (restoreErr) {
          console.warn('Session restore failed:', restoreErr.message);
        }
      }
      // If token expired and restore failed, return cached user for offline viewing
      return cachedUser || null;
    }
    return null;
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
