// API Client with Offline Resiliency and Fallback
const API = {
  baseUrl: '',

  async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
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
