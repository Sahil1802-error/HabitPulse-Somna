// High-Performance SVG & Canvas Charts Module (Zero External Dependencies)
const Charts = {
  // Render Circular Progress Gauge
  renderCircularProgress(container, percentage, label, color = '#6366f1', size = 110) {
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container) return;

    const stroke = 8;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const validPercent = Math.min(100, Math.max(0, percentage || 0));
    const offset = circumference - (validPercent / 100) * circumference;

    container.innerHTML = `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;">
        <svg width="${size}" height="${size}" style="transform: rotate(-90deg);">
          <circle
            cx="${size / 2}" cy="${size / 2}" r="${radius}"
            stroke="rgba(255,255,255,0.08)" stroke-width="${stroke}" fill="transparent"
          />
          <circle
            cx="${size / 2}" cy="${size / 2}" r="${radius}"
            stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}" stroke-linecap="round" fill="transparent"
            style="transition: stroke-dashoffset 0.8s ease;"
          />
        </svg>
        <div style="position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <span style="font-size: 1.25rem; font-weight: 800; line-height: 1;">${validPercent}%</span>
          ${label ? `<span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 600; margin-top: 3px;">${label}</span>` : ''}
        </div>
      </div>
    `;
  },

  // 7-Day Sleep Duration vs Target Bar Chart
  renderWeeklySleepChart(container, dailyData, targetHours = 8.0) {
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container || !dailyData || dailyData.length === 0) return;

    const height = 220;
    const width = container.clientWidth || 550;
    const padding = { top: 25, right: 20, bottom: 35, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = 10.0;
    const barWidth = Math.min(36, chartW / dailyData.length - 14);

    // Grid lines
    let gridLinesSvg = '';
    for (let h = 2; h <= 10; h += 2) {
      const y = padding.top + chartH - (h / maxVal) * chartH;
      gridLinesSvg += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />
        <text x="${padding.left - 8}" y="${y + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${h}h</text>
      `;
    }

    // Target Line (8h)
    const targetY = padding.top + chartH - (targetHours / maxVal) * chartH;
    const targetLineSvg = `
      <line x1="${padding.left}" y1="${targetY}" x2="${width - padding.right}" y2="${targetY}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5,4" />
      <text x="${width - padding.right}" y="${targetY - 6}" fill="#f59e0b" font-size="10" font-weight="700" text-anchor="end">Target: ${targetHours}h</text>
    `;

    // Bars
    let barsSvg = '';
    const step = chartW / dailyData.length;

    dailyData.forEach((d, idx) => {
      const val = d.sleepDuration || 0;
      const barH = Math.max(4, (val / maxVal) * chartH);
      const x = padding.left + idx * step + (step - barWidth) / 2;
      const y = padding.top + chartH - barH;

      // Color based on quality or target
      const isMet = val >= targetHours;
      const fillColor = isMet ? 'url(#sleepBarGradient)' : 'rgba(139, 92, 246, 0.7)';

      barsSvg += `
        <g class="chart-bar-group" style="cursor: pointer;">
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="6" fill="${fillColor}">
            <title>${d.dayName} (${d.date}): ${val}h sleep (Quality: ${d.sleepQuality}%)</title>
          </rect>
          <text x="${x + barWidth / 2}" y="${y - 6}" fill="var(--text-primary)" font-size="10" font-weight="700" text-anchor="middle">${val}h</text>
          <text x="${x + barWidth / 2}" y="${height - 10}" fill="var(--text-secondary)" font-size="11" font-weight="600" text-anchor="middle">${d.dayName}</text>
        </g>
      `;
    });

    container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <defs>
          <linearGradient id="sleepBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#06b6d4" />
            <stop offset="100%" stop-color="#6366f1" />
          </linearGradient>
        </defs>
        ${gridLinesSvg}
        ${targetLineSvg}
        ${barsSvg}
      </svg>
    `;
  },

  // Trend Line & Area Chart (Sleep Quality & Habit Adherence)
  renderTrendChart(container, dailyData) {
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container || !dailyData || dailyData.length === 0) return;

    const height = 220;
    const width = container.clientWidth || 550;
    const padding = { top: 25, right: 20, bottom: 35, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Grid lines for 0%, 50%, 100%
    let gridLinesSvg = '';
    [0, 50, 100].forEach(pct => {
      const y = padding.top + chartH - (pct / 100) * chartH;
      gridLinesSvg += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" />
        <text x="${padding.left - 6}" y="${y + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${pct}%</text>
      `;
    });

    const step = chartW / (dailyData.length - 1 || 1);

    // Sleep Quality points
    const qualityPoints = dailyData.map((d, i) => {
      const x = padding.left + i * step;
      const y = padding.top + chartH - ((d.sleepQuality || 0) / 100) * chartH;
      return { x, y, quality: d.sleepQuality, name: d.dayName, date: d.date };
    });

    // Habit Rate points
    const habitPoints = dailyData.map((d, i) => {
      const x = padding.left + i * step;
      const y = padding.top + chartH - ((d.habitRate || 0) / 100) * chartH;
      return { x, y, rate: d.habitRate, name: d.dayName, date: d.date };
    });

    const createPath = (points) => {
      return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    };

    const qualityPath = createPath(qualityPoints);
    const habitPath = createPath(habitPoints);

    // Area under quality curve
    const areaQualityPath = `${qualityPath} L ${qualityPoints[qualityPoints.length - 1].x} ${padding.top + chartH} L ${qualityPoints[0].x} ${padding.top + chartH} Z`;

    // Data dots
    let dotsSvg = '';
    qualityPoints.forEach((p, i) => {
      dotsSvg += `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#06b6d4" stroke="#0b0f19" stroke-width="2">
          <title>${p.name} Sleep Quality: ${p.quality}%</title>
        </circle>
        <circle cx="${habitPoints[i].x}" cy="${habitPoints[i].y}" r="4" fill="#10b981" stroke="#0b0f19" stroke-width="2">
          <title>${p.name} Habits Done: ${habitPoints[i].rate}%</title>
        </circle>
        <text x="${p.x}" y="${height - 10}" fill="var(--text-secondary)" font-size="11" font-weight="600" text-anchor="middle">${p.name}</text>
      `;
    });

    container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <defs>
          <linearGradient id="qualityAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${gridLinesSvg}
        <path d="${areaQualityPath}" fill="url(#qualityAreaGrad)" />
        <path d="${qualityPath}" fill="none" stroke="#06b6d4" stroke-width="3" stroke-linecap="round" />
        <path d="${habitPath}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4,3" />
        ${dotsSvg}
      </svg>
    `;
  },

  // 30-Day Monthly Calendar Heatmap
  renderMonthlyHeatmap(container, calendarDays) {
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container || !calendarDays) return;

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let headersHtml = daysOfWeek.map(d => `<div style="text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); padding: 4px;">${d}</div>`).join('');

    // Align the first day of the month with the correct column
    const firstDate = new Date(calendarDays[0].date);
    const firstDayIndex = (firstDate.getDay() + 6) % 7; // Convert to Mon=0 ... Sun=6

    let blankCellsHtml = '';
    for (let b = 0; b < firstDayIndex; b++) {
      blankCellsHtml += `<div style="opacity: 0.2; border: 1px dashed var(--border-color); border-radius: var(--radius-sm); min-height: 62px;"></div>`;
    }

    const cellsHtml = calendarDays.map(day => {
      // Calculate background intensity based on sleep quality & habit rate
      const rate = day.habitRate || 0;
      const sleepQ = day.sleepQuality || 0;
      let bg = 'rgba(255,255,255,0.03)';
      let border = 'var(--border-color)';

      if (rate >= 80 && sleepQ >= 80) {
        bg = 'rgba(16, 185, 129, 0.22)';
        border = 'rgba(16, 185, 129, 0.4)';
      } else if (rate >= 50 || sleepQ >= 70) {
        bg = 'rgba(99, 102, 241, 0.18)';
        border = 'rgba(99, 102, 241, 0.35)';
      }

      return `
        <div class="calendar-day-cell" style="background: ${bg}; border-color: ${border};" onclick="App.selectDate('${day.date}')">
          <div class="calendar-day-header">
            <span>${day.dayNumber}</span>
            ${day.sleepQuality ? `<span style="font-size: 0.7rem; color: var(--accent-cyan);">${day.sleepQuality}%</span>` : ''}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin: 3px 0;">
            ${day.completedHabits}/${day.totalHabits} done
          </div>
          <div style="height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div style="width: ${rate}%; height: 100%; background: var(--accent-emerald);"></div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="calendar-heatmap-grid">
        ${headersHtml}
        ${blankCellsHtml}
        ${cellsHtml}
      </div>
    `;
  },

  // Lightweight Canvas Confetti
  fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 8 + 4,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45; // gravity
        p.rotation += p.rSpeed;
        p.opacity -= 0.016;

        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      if (alive) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();
  }
};
