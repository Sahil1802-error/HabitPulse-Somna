// Main Frontend Controller for Habit & Sleep Analytics
const App = {
  currentView: 'daily',
  selectedDate: '2026-10-23',
  currentUser: null,

  async init() {
    this.setupTheme();
    this.setupEventListeners();
    this.setupDateControls();
    await this.checkAuthStatus();
    this.loadCurrentView();
  },

  // ----------------- Theme Setup -----------------
  setupTheme() {
    const savedTheme = localStorage.getItem('hs_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.getElementById('theme-toggle-btn');
    if (themeIcon) {
      themeIcon.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hs_theme', next);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = next === 'dark' ? '☀️' : '🌙';
    }
  },

  // ----------------- Authentication -----------------
  async checkAuthStatus() {
    this.currentUser = API.getUser();
    this.updateUserUI();

    // Verify token with server in background
    if (this.currentUser) {
      try {
        const verifiedUser = await API.getMe();
        if (verifiedUser) {
          this.currentUser = verifiedUser;
          this.updateUserUI();
          this.syncLocalToCloud();
        } else {
          this.currentUser = null;
          this.updateUserUI();
        }
      } catch (e) {
        // Still keep cached user for offline viewing
      }
    }
  },

  updateUserUI() {
    const loggedOutDiv = document.getElementById('auth-logged-out');
    const loggedInDiv = document.getElementById('auth-logged-in');
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar-initial');

    if (this.currentUser) {
      if (loggedOutDiv) loggedOutDiv.style.display = 'none';
      if (loggedInDiv) loggedInDiv.style.display = 'flex';
      if (nameEl) nameEl.textContent = this.currentUser.name || this.currentUser.email;
      if (avatarEl) avatarEl.textContent = (this.currentUser.name || this.currentUser.email || 'U').charAt(0).toUpperCase();
    } else {
      if (loggedOutDiv) loggedOutDiv.style.display = 'flex';
      if (loggedInDiv) loggedInDiv.style.display = 'none';
    }
  },

  switchAuthTab(tab) {
    const isLogin = tab === 'login';
    const modalTitle = document.getElementById('auth-modal-title');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const switchText = document.getElementById('auth-switch-text');
    const errorBanner = document.getElementById('auth-error-banner');

    if (errorBanner) errorBanner.style.display = 'none';

    if (isLogin) {
      if (modalTitle) modalTitle.textContent = 'Sign In';
      if (tabLogin) { tabLogin.style.background = 'var(--accent-indigo)'; tabLogin.style.color = '#fff'; }
      if (tabSignup) { tabSignup.style.background = 'transparent'; tabSignup.style.color = 'var(--text-secondary)'; }
      if (loginForm) loginForm.style.display = 'block';
      if (signupForm) signupForm.style.display = 'none';
      if (switchText) switchText.innerHTML = `Don't have an account? <a href="#" style="color: var(--accent-cyan); text-decoration: underline;" onclick="App.switchAuthTab('signup'); return false;">Sign up here</a>`;
    } else {
      if (modalTitle) modalTitle.textContent = 'Create Account';
      if (tabLogin) { tabLogin.style.background = 'transparent'; tabLogin.style.color = 'var(--text-secondary)'; }
      if (tabSignup) { tabSignup.style.background = 'var(--accent-indigo)'; tabSignup.style.color = '#fff'; }
      if (loginForm) loginForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
      if (switchText) switchText.innerHTML = `Already have an account? <a href="#" style="color: var(--accent-cyan); text-decoration: underline;" onclick="App.switchAuthTab('login'); return false;">Sign in here</a>`;
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorBanner = document.getElementById('auth-error-banner');

    try {
      if (errorBanner) errorBanner.style.display = 'none';
      const res = await API.login(email, password);
      this.currentUser = res.user;
      this.updateUserUI();
      this.closeModal('auth-modal');
      e.target.reset();
      this.showToast(`Welcome back, ${res.user.name || 'there'}!`, 'success');
      this.loadCurrentView();
    } catch (err) {
      if (errorBanner) {
        errorBanner.textContent = err.message || 'Login failed. Please check your credentials.';
        errorBanner.style.display = 'block';
      }
    }
  },

  async handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorBanner = document.getElementById('auth-error-banner');

    try {
      if (errorBanner) errorBanner.style.display = 'none';
      const res = await API.signup(name, email, password);
      this.currentUser = res.user;
      this.updateUserUI();
      this.closeModal('auth-modal');
      e.target.reset();
      Charts.fireConfetti();
      this.showToast(`Welcome, ${res.user.name}! Your tracker is ready.`, 'success');
      this.loadCurrentView();
    } catch (err) {
      if (errorBanner) {
        errorBanner.textContent = err.message || 'Signup failed. Please try again.';
        errorBanner.style.display = 'block';
      }
    }
  },

  handleLogout() {
    API.logout();
    this.currentUser = null;
    this.updateUserUI();
    this.showToast('Logged out. Viewing demo tracker.', 'info');
    this.loadCurrentView();
  },

  // Mirror user's database in localStorage for offline & cold-start preservation
  async backupUserLocalData(data) {
    if (!this.currentUser) return;
    try {
      localStorage.setItem(`hs_user_data_${this.currentUser.id}`, JSON.stringify(data));
    } catch (e) {}
  },

  async syncLocalToCloud() {
    if (!this.currentUser) return;
    try {
      const cached = localStorage.getItem(`hs_user_data_${this.currentUser.id}`);
      if (cached) {
        const payload = JSON.parse(cached);
        await API.syncUserData(payload);
      }
    } catch (e) {}
  },

  // ----------------- Event Listeners -----------------
  setupEventListeners() {
    // Auth Triggers
    document.getElementById('btn-login-trigger')?.addEventListener('click', () => {
      this.switchAuthTab('login');
      this.openModal('auth-modal');
    });
    document.getElementById('btn-signup-trigger')?.addEventListener('click', () => {
      this.switchAuthTab('signup');
      this.openModal('auth-modal');
    });
    document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());

    document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('signup-form')?.addEventListener('submit', (e) => this.handleSignup(e));

    // View Pills
    document.querySelectorAll('.view-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Modal Triggers
    document.getElementById('btn-add-habit')?.addEventListener('click', () => this.openModal('habit-modal'));
    document.getElementById('btn-log-sleep')?.addEventListener('click', () => this.openSleepModal(this.selectedDate));
    document.getElementById('btn-data-options')?.addEventListener('click', () => this.openModal('data-modal'));

    // Sleep Modal Date change: auto load that date's sleep info
    document.getElementById('sleep-date-input')?.addEventListener('change', (e) => {
      if (e.target.value) this.loadSleepModalForDate(e.target.value);
    });

    // Quality slider range value update
    const qualityRange = document.getElementById('sleep-quality-range');
    const qualityVal = document.getElementById('quality-val-display');
    if (qualityRange && qualityVal) {
      qualityRange.addEventListener('input', (e) => {
        qualityVal.textContent = `${e.target.value}%`;
      });
    }

    // Forms
    document.getElementById('habit-form')?.addEventListener('submit', (e) => this.handleHabitSubmit(e));
    document.getElementById('sleep-form')?.addEventListener('submit', (e) => this.handleSleepSubmit(e));

    // Interactive Factor Chips Toggles
    document.querySelectorAll('.factor-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const cb = chip.querySelector('.factor-checkbox');
        if (!cb) return;
        if (e.target !== cb) {
          cb.checked = !cb.checked;
        }
        chip.classList.toggle('active', cb.checked);
      });
    });
  },

  setupDateControls() {
    const prevBtn = document.getElementById('date-prev-btn');
    const nextBtn = document.getElementById('date-next-btn');
    const todayBtn = document.getElementById('date-today-btn');
    const dateInput = document.getElementById('date-picker-input');

    if (dateInput) {
      dateInput.value = this.selectedDate;
      dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
          this.selectDate(e.target.value);
        }
      });
    }

    prevBtn?.addEventListener('click', () => this.navigateDate(-1));
    nextBtn?.addEventListener('click', () => this.navigateDate(1));
    todayBtn?.addEventListener('click', () => this.selectDate('2026-10-23'));
  },

  // ----------------- Date Navigation -----------------
  navigateDate(direction) {
    const d = new Date(this.selectedDate);
    if (this.currentView === 'daily') {
      d.setDate(d.getDate() + direction);
    } else if (this.currentView === 'weekly') {
      d.setDate(d.getDate() + direction * 7);
    } else if (this.currentView === 'monthly') {
      d.setMonth(d.getMonth() + direction);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    this.selectDate(`${y}-${m}-${day}`);
  },

  selectDate(dateStr) {
    this.selectedDate = dateStr;
    const dateInput = document.getElementById('date-picker-input');
    if (dateInput) dateInput.value = dateStr;
    this.updateDateDisplay();
    this.loadCurrentView();
  },

  updateDateDisplay() {
    const display = document.getElementById('date-display-text');
    if (!display) return;

    const d = new Date(this.selectedDate);
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };

    if (this.currentView === 'daily') {
      display.textContent = d.toLocaleDateString(undefined, options);
    } else if (this.currentView === 'weekly') {
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diff);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      display.textContent = `${mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (this.currentView === 'monthly') {
      display.textContent = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } else {
      display.textContent = 'All Time Insights';
    }
  },

  // ----------------- View Switching -----------------
  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.view-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    ['daily-view', 'weekly-view', 'monthly-view', 'insights-view'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (id === `${viewName}-view`) ? 'block' : 'none';
    });

    this.updateDateDisplay();
    this.loadCurrentView();
  },

  async loadCurrentView() {
    try {
      if (this.currentView === 'daily') {
        const res = await API.getDailyAnalytics(this.selectedDate);
        this.renderDailyView(res.data);
      } else if (this.currentView === 'weekly') {
        const res = await API.getWeeklyAnalytics(this.selectedDate);
        this.renderWeeklyView(res.data);
      } else if (this.currentView === 'monthly') {
        const [year, month] = this.selectedDate.split('-');
        const res = await API.getMonthlyAnalytics(year, month);
        this.renderMonthlyView(res.data);
      } else if (this.currentView === 'insights') {
        const res = await API.getInsights();
        this.renderInsightsView(res.data);
      }

      // Auto-cache user's data in background for instant reload
      if (this.currentUser) {
        API.exportBackup().then(b => {
          if (b.data) this.backupUserLocalData(b.data);
        }).catch(() => {});
      }
    } catch (err) {
      this.showToast('Could not load data. Reconnecting...', 'error');
    }
  },

  // ----------------- Daily View -----------------
  renderDailyView(data) {
    if (!data) return;

    Charts.renderCircularProgress('daily-score-gauge', data.summary.dailyScore, 'Daily Score', '#6366f1', 95);
    Charts.renderCircularProgress('daily-habit-gauge', data.summary.habitCompletionRate, 'Completed', '#10b981', 95);

    document.getElementById('stat-habits-done').textContent = `${data.summary.completedHabits} / ${data.summary.totalHabits}`;
    document.getElementById('stat-habit-rate').textContent = `${data.summary.habitCompletionRate}% completed`;

    const sleep = data.sleep;
    const sleepDurEl = document.getElementById('stat-sleep-duration');
    const sleepQualEl = document.getElementById('stat-sleep-quality');
    const sleepStageBar = document.getElementById('daily-sleep-stages');
    const sleepFactors = document.getElementById('daily-sleep-factors');
    const sleepNotes = document.getElementById('daily-sleep-notes');

    if (sleep) {
      sleepDurEl.textContent = `${sleep.duration} hrs`;
      sleepQualEl.textContent = `${sleep.quality}% Sleep Quality`;

      const deepPct = Math.round((sleep.deepSleepHours / sleep.duration) * 100) || 20;
      const remPct = Math.round((sleep.remSleepHours / sleep.duration) * 100) || 25;
      const lightPct = 100 - deepPct - remPct;

      sleepStageBar.innerHTML = `
        <div class="stage-deep" style="width: ${deepPct}%;" title="Deep Sleep: ${sleep.deepSleepHours}h (${deepPct}%)"></div>
        <div class="stage-rem" style="width: ${remPct}%;" title="REM Sleep: ${sleep.remSleepHours}h (${remPct}%)"></div>
        <div class="stage-light" style="width: ${lightPct}%;" title="Light Sleep: ${sleep.lightSleepHours}h (${lightPct}%)"></div>
      `;

      sleepFactors.innerHTML = (sleep.factors && sleep.factors.length > 0)
        ? sleep.factors.map(f => {
            const isPos = ['exercised', 'cool_room', 'reading', 'meditation', 'consistent_time'].includes(f);
            const name = f.replace(/_/g, ' ');
            return `<span class="factor-tag ${isPos ? 'positive' : 'negative'}">${isPos ? '✓ ' : '⚠ '}${name}</span>`;
          }).join('')
        : '<span style="font-size: 0.8rem; color: var(--text-muted);">No factors recorded</span>';

      sleepNotes.textContent = sleep.notes ? `"${sleep.notes}"` : 'Bedtime: ' + sleep.bedtime + ' • Wake: ' + sleep.wakeTime;
    } else {
      sleepDurEl.textContent = 'No log';
      sleepQualEl.textContent = 'Click "Log Sleep" above';
      sleepStageBar.innerHTML = '<div style="width: 100%; background: rgba(255,255,255,0.05);"></div>';
      sleepFactors.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);">No sleep logged for this date</span>';
      sleepNotes.textContent = 'Track last night to see deep sleep & quality breakdown.';
    }

    const listEl = document.getElementById('daily-habit-list');
    if (!listEl) return;

    if (data.habits.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          No habits tracked yet. Click "+ Add Habit" to start building your routine!
        </div>
      `;
      return;
    }

    listEl.innerHTML = data.habits.map(h => {
      const isDone = h.completed;
      return `
        <div class="habit-item ${isDone ? 'completed' : ''}" onclick="App.toggleHabit('${h.id}', event)">
          <div class="habit-left">
            <div class="habit-checkbox">
              ${isDone ? '✓' : ''}
            </div>
            <div style="font-size: 22px; line-height: 1;">${h.icon || '🎯'}</div>
            <div class="habit-item-info">
              <span class="habit-title">${h.title}</span>
              <div class="habit-meta">
                <span class="habit-badge" style="background: ${h.color}22; color: ${h.color};">${h.category}</span>
                <span>Target: ${h.targetCount} ${h.unit}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="habit-streak-pill" title="Current streak">
              🔥 ${h.currentStreak}d
            </div>
            <button class="btn-icon" style="width: 30px; height: 30px; font-size: 14px;" onclick="App.deleteHabit('${h.id}', event)" title="Delete habit">
              ✕
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ----------------- Weekly View -----------------
  renderWeeklyView(data) {
    if (!data) return;

    document.getElementById('weekly-avg-sleep').textContent = `${data.summary.avgSleepDuration}h`;
    document.getElementById('weekly-avg-quality').textContent = `${data.summary.avgSleepQuality}%`;
    document.getElementById('weekly-overall-habit-rate').textContent = `${data.summary.overallHabitRate}%`;

    const debtEl = document.getElementById('weekly-sleep-debt');
    const debt = data.summary.sleepDebt;
    if (debt > 0) {
      debtEl.innerHTML = `<span style="color: var(--accent-rose); font-weight: 700;">-${debt}h debt</span>`;
    } else {
      debtEl.innerHTML = `<span style="color: var(--accent-emerald); font-weight: 700;">+${Math.abs(debt)}h surplus</span>`;
    }

    Charts.renderWeeklySleepChart('weekly-sleep-chart-container', data.dailyBreakdown, 8.0);
    Charts.renderTrendChart('weekly-trend-chart-container', data.dailyBreakdown);

    const matrixEl = document.getElementById('weekly-matrix-container');
    if (!matrixEl) return;

    const daysHeader = data.days.map(dStr => {
      const dayNum = dStr.split('-')[2];
      const d = new Date(dStr);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      return `<th>${dayName}<br><span style="font-size: 0.72rem; opacity: 0.7;">${dayNum}</span></th>`;
    }).join('');

    const matrixRows = data.habitMatrix.map(hm => {
      const checkCells = hm.days.map(day => `
        <td>
          <div class="matrix-cell-check ${day.completed ? 'checked' : ''}" title="${day.date}: ${day.completed ? 'Completed' : 'Skipped'}">
            ${day.completed ? '✓' : '—'}
          </div>
        </td>
      `).join('');

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>${hm.icon}</span>
              <strong style="color: var(--text-primary); font-size: 0.9rem;">${hm.title}</strong>
            </div>
          </td>
          ${checkCells}
          <td style="font-weight: 700; color: ${hm.weeklyRate >= 70 ? 'var(--accent-emerald)' : 'var(--text-secondary)'};">
            ${hm.weeklyCompleted}/7 (${hm.weeklyRate}%)
          </td>
        </tr>
      `;
    }).join('');

    matrixEl.innerHTML = `
      <div class="matrix-container">
        <table class="matrix-table">
          <thead>
            <tr>
              <th style="min-width: 180px;">Habit</th>
              ${daysHeader}
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${matrixRows}
          </tbody>
        </table>
      </div>
    `;
  },

  // ----------------- Monthly View -----------------
  renderMonthlyView(data) {
    if (!data) return;

    document.getElementById('monthly-total-sleep').textContent = `${data.summary.totalSleepHours}h`;
    document.getElementById('monthly-avg-quality').textContent = `${data.summary.avgSleepQuality}%`;
    document.getElementById('monthly-total-habits-checked').textContent = `${data.summary.totalCompletedHabits}`;
    document.getElementById('monthly-habit-rate').textContent = `${data.summary.overallHabitRate}%`;

    Charts.renderMonthlyHeatmap('monthly-calendar-container', data.calendarDays);

    const catContainer = document.getElementById('monthly-category-container');
    if (catContainer) {
      catContainer.innerHTML = (data.categories || []).map(cat => `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">
            <span>${cat.category}</span>
            <span style="color: var(--accent-indigo);">${cat.completed} done (${cat.rate}%)</span>
          </div>
          <div style="height: 8px; background: rgba(255,255,255,0.06); border-radius: var(--radius-full); overflow: hidden;">
            <div style="width: ${cat.rate}%; height: 100%; background: var(--gradient-brand); border-radius: var(--radius-full);"></div>
          </div>
        </div>
      `).join('');
    }
  },

  // ----------------- Insights View -----------------
  renderInsightsView(data) {
    if (!data) return;

    const recsEl = document.getElementById('insights-recommendations');
    if (recsEl) {
      recsEl.innerHTML = (data.recommendations || []).map(r => `
        <div class="card" style="margin-bottom: 14px; border-left: 4px solid var(--accent-indigo); background: rgba(99, 102, 241, 0.05);">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
            💡 ${r.title}
          </h4>
          <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">${r.description}</p>
        </div>
      `).join('');
    }

    const corrEl = document.getElementById('insights-correlations');
    if (corrEl) {
      corrEl.innerHTML = (data.correlations || []).map(c => {
        const isPos = c.impact >= 0;
        return `
          <div class="correlation-card">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 22px;">${c.icon}</span>
              <div>
                <strong style="font-size: 0.95rem;">${c.title}</strong>
                <div style="font-size: 0.78rem; color: var(--text-muted);">
                  With: ${c.avgQualityWith}% sleep quality • Without: ${c.avgQualityWithout}%
                </div>
              </div>
            </div>
            <div class="correlation-score ${isPos ? 'score-positive' : 'score-negative'}">
              ${isPos ? '+' : ''}${c.impact}%
            </div>
          </div>
        `;
      }).join('');
    }

    const chronoEl = document.getElementById('insights-chronotype');
    if (chronoEl && data.chronotype) {
      chronoEl.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="padding: 14px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md);">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">WEEKDAYS</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin-top: 4px;">
              ${data.chronotype.weekdayAvgDuration}h
            </div>
            <div style="font-size: 0.78rem; color: var(--accent-cyan);">${data.chronotype.weekdayAvgQuality}% avg score</div>
          </div>
          <div style="padding: 14px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md);">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">WEEKENDS</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin-top: 4px;">
              ${data.chronotype.weekendAvgDuration}h
            </div>
            <div style="font-size: 0.78rem; color: var(--accent-cyan);">${data.chronotype.weekendAvgQuality}% avg score</div>
          </div>
        </div>
      `;
    }
  },

  // ----------------- Habit Actions -----------------
  async toggleHabit(habitId, event) {
    if (event) event.stopPropagation();
    try {
      const res = await API.toggleHabit(habitId, this.selectedDate);
      if (res.data && res.data.completed) {
        Charts.fireConfetti();
        this.showToast('Habit completed! Keep the streak alive 🔥', 'success');
      }
      this.loadCurrentView();
    } catch (err) {
      this.showToast('Could not toggle habit', 'error');
    }
  },

  async handleHabitSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('habit-title-input').value;
    const category = document.getElementById('habit-category-input').value;
    const icon = document.getElementById('habit-icon-input').value || '🎯';
    const targetCount = document.getElementById('habit-target-input').value;
    const unit = document.getElementById('habit-unit-input').value || 'times';

    try {
      await API.createHabit({ title, category, icon, targetCount, unit });
      this.closeModal('habit-modal');
      e.target.reset();
      this.showToast('New habit created!', 'success');
      this.loadCurrentView();
    } catch (err) {
      this.showToast('Error creating habit', 'error');
    }
  },

  async deleteHabit(habitId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Are you sure you want to delete this habit?')) return;

    try {
      await API.deleteHabit(habitId);
      this.showToast('Habit deleted', 'info');
      this.loadCurrentView();
    } catch (err) {
      this.showToast('Error deleting habit', 'error');
    }
  },

  // ----------------- Sleep Actions -----------------
  openSleepModal(date) {
    const targetDate = date || this.selectedDate;
    const dateInput = document.getElementById('sleep-date-input');
    if (dateInput) dateInput.value = targetDate;
    this.loadSleepModalForDate(targetDate);
    this.openModal('sleep-modal');
  },

  async loadSleepModalForDate(date) {
    try {
      const res = await API.getDailyAnalytics(date);
      const sleep = res.data && res.data.sleep;

      if (sleep) {
        // Parse Bedtime 24h to 12h
        const [bh, bm] = (sleep.bedtime || "23:00").split(':').map(Number);
        let bedH12 = bh % 12 || 12;
        let bedAmpm = bh >= 12 ? 'PM' : 'AM';
        let bedMStr = String(bm).padStart(2, '0');
        const roundedM = String(Math.round(bm / 5) * 5 % 60).padStart(2, '0');

        const bedHourSelect = document.getElementById('bed-hour');
        const bedMinSelect = document.getElementById('bed-min');
        if (bedHourSelect) bedHourSelect.value = String(bedH12);
        if (bedMinSelect) bedMinSelect.value = bedMinSelect.querySelector(`option[value="${bedMStr}"]`) ? bedMStr : roundedM;
        this.setAmPm('bed', bedAmpm, false);

        // Parse Wake Time 24h to 12h
        const [wh, wm] = (sleep.wakeTime || "07:00").split(':').map(Number);
        let wakeH12 = wh % 12 || 12;
        let wakeAmpm = wh >= 12 ? 'PM' : 'AM';
        let wakeMStr = String(wm).padStart(2, '0');
        const roundedWM = String(Math.round(wm / 5) * 5 % 60).padStart(2, '0');

        const wakeHourSelect = document.getElementById('wake-hour');
        const wakeMinSelect = document.getElementById('wake-min');
        if (wakeHourSelect) wakeHourSelect.value = String(wakeH12);
        if (wakeMinSelect) wakeMinSelect.value = wakeMinSelect.querySelector(`option[value="${wakeMStr}"]`) ? wakeMStr : roundedWM;
        this.setAmPm('wake', wakeAmpm, false);

        // Quality slider
        const qualityRange = document.getElementById('sleep-quality-range');
        const qualityVal = document.getElementById('quality-val-display');
        if (qualityRange) qualityRange.value = sleep.quality || 80;
        if (qualityVal) qualityVal.textContent = `${sleep.quality || 80}%`;

        // Mood
        const moodSelect = document.getElementById('sleep-mood');
        if (moodSelect) moodSelect.value = sleep.moodOnWake || 'refreshed';

        // Notes
        const notesEl = document.getElementById('sleep-notes');
        if (notesEl) notesEl.value = sleep.notes || '';

        // Only select factors that the user previously saved for this date!
        const recordedFactors = Array.isArray(sleep.factors) ? sleep.factors : [];
        document.querySelectorAll('.factor-chip').forEach(chip => {
          const cb = chip.querySelector('.factor-checkbox');
          if (cb) {
            const active = recordedFactors.includes(cb.value);
            cb.checked = active;
            chip.classList.toggle('active', active);
          }
        });
      } else {
        // Clean slate! No factors chosen by default!
        const bedHour = document.getElementById('bed-hour');
        const bedMin = document.getElementById('bed-min');
        if (bedHour) bedHour.value = "11";
        if (bedMin) bedMin.value = "00";
        this.setAmPm('bed', 'PM', false);

        const wakeHour = document.getElementById('wake-hour');
        const wakeMin = document.getElementById('wake-min');
        if (wakeHour) wakeHour.value = "7";
        if (wakeMin) wakeMin.value = "00";
        this.setAmPm('wake', 'AM', false);

        const qualityRange = document.getElementById('sleep-quality-range');
        const qualityVal = document.getElementById('quality-val-display');
        if (qualityRange) qualityRange.value = 80;
        if (qualityVal) qualityVal.textContent = "80%";

        const moodSelect = document.getElementById('sleep-mood');
        if (moodSelect) moodSelect.value = 'refreshed';

        const notesEl = document.getElementById('sleep-notes');
        if (notesEl) notesEl.value = '';

        // Reset all factor chips to unchecked!
        document.querySelectorAll('.factor-chip').forEach(chip => {
          const cb = chip.querySelector('.factor-checkbox');
          if (cb) cb.checked = false;
          chip.classList.remove('active');
        });
      }

      this.onTimePickerChange();
    } catch (err) {
      console.warn('Error loading sleep data for modal:', err);
    }
  },

  setAmPm(type, ampm, triggerChange = true) {
    if (type === 'bed') {
      document.getElementById('bed-pm')?.classList.toggle('active', ampm === 'PM');
      document.getElementById('bed-am')?.classList.toggle('active', ampm === 'AM');
    } else if (type === 'wake') {
      document.getElementById('wake-pm')?.classList.toggle('active', ampm === 'PM');
      document.getElementById('wake-am')?.classList.toggle('active', ampm === 'AM');
    }
    if (triggerChange) {
      this.onTimePickerChange();
    }
  },

  onTimePickerChange() {
    const bedHour = Number(document.getElementById('bed-hour')?.value || 11);
    const bedMin = Number(document.getElementById('bed-min')?.value || 0);
    const bedPmActive = document.getElementById('bed-pm')?.classList.contains('active');
    const bedAmpm = bedPmActive ? 'PM' : 'AM';

    const wakeHour = Number(document.getElementById('wake-hour')?.value || 7);
    const wakeMin = Number(document.getElementById('wake-min')?.value || 0);
    const wakePmActive = document.getElementById('wake-pm')?.classList.contains('active');
    const wakeAmpm = wakePmActive ? 'PM' : 'AM';

    const to24h = (h, m, ampm) => {
      let hour24 = h;
      if (ampm === 'PM' && hour24 < 12) hour24 += 12;
      if (ampm === 'AM' && hour24 === 12) hour24 = 0;
      return `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const bedtime24 = to24h(bedHour, bedMin, bedAmpm);
    const wakeTime24 = to24h(wakeHour, wakeMin, wakeAmpm);

    const bedtimeInput = document.getElementById('sleep-bedtime');
    const wakeInput = document.getElementById('sleep-waketime');
    if (bedtimeInput) bedtimeInput.value = bedtime24;
    if (wakeInput) wakeInput.value = wakeTime24;

    const [bh, bm] = bedtime24.split(':').map(Number);
    const [wh, wm] = wakeTime24.split(':').map(Number);
    let diffMinutes = (wh * 60 + wm) - (bh * 60 + bm);
    if (diffMinutes <= 0) diffMinutes += 24 * 60;

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const decimalHours = Math.round((diffMinutes / 60) * 10) / 10;

    const durationInput = document.getElementById('sleep-duration');
    if (durationInput) durationInput.value = decimalHours;

    const bannerDisplay = document.getElementById('calc-sleep-duration-display');
    if (bannerDisplay) {
      bannerDisplay.textContent = `${hours} hrs ${mins > 0 ? mins + ' mins' : '00 mins'}`;
    }
  },

  async handleSleepSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('sleep-date-input').value;
    const bedtime = document.getElementById('sleep-bedtime').value;
    const wakeTime = document.getElementById('sleep-waketime').value;
    const duration = Number(document.getElementById('sleep-duration').value) || 8;
    const quality = Number(document.getElementById('sleep-quality-range').value) || 80;
    const moodOnWake = document.getElementById('sleep-mood').value;
    const notes = document.getElementById('sleep-notes').value;

    const factors = [];
    document.querySelectorAll('.factor-checkbox:checked').forEach(cb => {
      factors.push(cb.value);
    });

    try {
      await API.saveSleep({
        date,
        bedtime,
        wakeTime,
        duration,
        quality,
        factors,
        moodOnWake,
        notes
      });
      this.closeModal('sleep-modal');
      this.showToast('Sleep log recorded successfully!', 'success');
      this.loadCurrentView();
    } catch (err) {
      this.showToast('Error saving sleep log', 'error');
    }
  },

  // ----------------- Data Options -----------------
  async seedDemoData() {
    if (!confirm('This will load 35 days of sample habits, streaks, and sleep correlations. Continue?')) return;
    try {
      await API.seedData();
      this.closeModal('data-modal');
      this.showToast('Historical data pre-loaded!', 'success');
      this.loadCurrentView();
    } catch (err) {
      this.showToast('Could not seed data', 'error');
    }
  },

  async exportData() {
    try {
      const res = await API.exportBackup();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `habitsync_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      this.showToast('Database exported to JSON', 'success');
    } catch (err) {
      this.showToast('Export failed', 'error');
    }
  },

  triggerFileInput() {
    document.getElementById('import-file-input')?.click();
  },

  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        await API.importBackup(json);
        this.closeModal('data-modal');
        this.showToast('Backup restored successfully!', 'success');
        this.loadCurrentView();
      } catch (err) {
        this.showToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  },

  // ----------------- Modal Utilities -----------------
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  // ----------------- Toast Notifications -----------------
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : 'ℹ'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
