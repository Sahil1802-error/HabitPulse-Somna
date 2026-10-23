// Persistent JSON Database Engine for Habit & Sleep Tracker
// Designed for both local development and Vercel Serverless Functions
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

// In-memory cache for serverless environments where local filesystem might be ephemeral
let memoryDb = null;

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

function formatDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDefaultData() {
  const habits = [
    {
      id: "h-1",
      title: "Morning Sunlight & Walk",
      category: "Health",
      icon: "☀️",
      color: "#f59e0b",
      frequency: "daily",
      targetCount: 20,
      unit: "min",
      createdAt: "2026-09-01T08:00:00Z"
    },
    {
      id: "h-2",
      title: "Strength Training / Cardio",
      category: "Fitness",
      icon: "🏋️",
      color: "#ef4444",
      frequency: "daily",
      targetCount: 45,
      unit: "min",
      createdAt: "2026-09-01T08:00:00Z"
    },
    {
      id: "h-3",
      title: "Mindful Meditation",
      category: "Mindfulness",
      icon: "🧘",
      color: "#8b5cf6",
      frequency: "daily",
      targetCount: 15,
      unit: "min",
      createdAt: "2026-09-01T08:00:00Z"
    },
    {
      id: "h-4",
      title: "Drink 3 Liters Water",
      category: "Health",
      icon: "💧",
      color: "#06b6d4",
      frequency: "daily",
      targetCount: 3,
      unit: "L",
      createdAt: "2026-09-01T08:00:00Z"
    },
    {
      id: "h-5",
      title: "Read Non-Fiction Book",
      category: "Learning",
      icon: "📖",
      color: "#3b82f6",
      frequency: "daily",
      targetCount: 20,
      unit: "pages",
      createdAt: "2026-09-01T08:00:00Z"
    },
    {
      id: "h-6",
      title: "No Screen 45m Before Bed",
      category: "Sleep",
      icon: "🌙",
      color: "#10b981",
      frequency: "daily",
      targetCount: 1,
      unit: "check",
      createdAt: "2026-09-01T08:00:00Z"
    }
  ];

  // Generate 35 days of historical data up to today (2026-10-23)
  const habitLogs = [];
  const sleepLogs = [];
  const today = new Date(2026, 9, 23); // Month is 0-indexed: 9 = October

  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateLocal(d);

    // Seed habit logs with realistic completion probability
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isGoodDay = (i % 7 !== 2 && i % 7 !== 5);

    habits.forEach((habit, hIdx) => {
      let completed = false;
      let val = 0;

      // Realistic variation per habit
      const rand = (Math.sin(i * 13 + hIdx * 7) + 1) / 2;
      if (hIdx === 0) completed = rand > 0.25; // Sunlight
      if (hIdx === 1) completed = isWeekend ? rand > 0.4 : rand > 0.3; // Exercise
      if (hIdx === 2) completed = rand > 0.35; // Meditation
      if (hIdx === 3) completed = rand > 0.2;  // Water
      if (hIdx === 4) completed = rand > 0.3;  // Reading
      if (hIdx === 5) completed = isGoodDay ? rand > 0.25 : rand > 0.65; // No screens

      if (completed) {
        val = habit.targetCount;
        habitLogs.push({
          id: `hl-${dateStr}-${habit.id}`,
          habitId: habit.id,
          date: dateStr,
          completed: true,
          value: val,
          notes: completed ? "Accomplished target" : ""
        });
      }
    });

    // Seed sleep logs correlated with habit adherence
    const didExercise = habitLogs.some(hl => hl.date === dateStr && hl.habitId === "h-2" && hl.completed);
    const didNoScreen = habitLogs.some(hl => hl.date === dateStr && hl.habitId === "h-6" && hl.completed);
    const didMeditate = habitLogs.some(hl => hl.date === dateStr && hl.habitId === "h-3" && hl.completed);

    let duration = 7.5;
    let quality = 78;
    let bedtime = "23:15";
    let wakeTime = "06:45";
    const factors = [];

    if (didExercise) {
      duration += 0.4;
      quality += 6;
      factors.push("exercised");
    }
    if (didNoScreen) {
      duration += 0.5;
      quality += 10;
      factors.push("cool_room", "reading");
    } else {
      quality -= 12;
      factors.push("screen_time");
    }
    if (didMeditate) {
      quality += 4;
    }
    if (isWeekend) {
      bedtime = "23:45";
      wakeTime = "07:45";
      duration += 0.5;
    }

    // Add gentle noise
    const noise = ((Math.sin(i * 5) + 1) / 2) * 8 - 4;
    quality = Math.max(52, Math.min(98, Math.round(quality + noise)));
    duration = Math.max(5.5, Math.min(9.5, Math.round((duration + (noise / 10)) * 10) / 10));

    // Calculate sleep stages
    const deepHours = Math.round((duration * (quality > 80 ? 0.23 : 0.16)) * 10) / 10;
    const remHours = Math.round((duration * (quality > 80 ? 0.24 : 0.20)) * 10) / 10;
    const lightHours = Math.round((duration - deepHours - remHours) * 10) / 10;

    let mood = "refreshed";
    if (quality >= 88) mood = "energized";
    else if (quality >= 75) mood = "refreshed";
    else if (quality >= 65) mood = "normal";
    else mood = "tired";

    sleepLogs.push({
      id: `sl-${dateStr}`,
      date: dateStr,
      bedtime,
      wakeTime,
      duration,
      quality,
      deepSleepHours: deepHours,
      remSleepHours: remHours,
      lightSleepHours: lightHours,
      efficiency: Math.min(98, Math.max(70, Math.round(quality * 0.95 + 4))),
      factors,
      moodOnWake: mood,
      notes: quality > 85 ? "Great deep restorative sleep" : "A bit restless earlier in the night"
    });
  }

  return {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    habits,
    habitLogs,
    sleepLogs
  };
}

function getDatabase() {
  if (memoryDb) {
    return memoryDb;
  }

  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      memoryDb = JSON.parse(content);
      return memoryDb;
    }
  } catch (err) {
    console.warn("Could not read database from disk, using fallback:", err.message);
  }

  // Initialize with rich default data
  memoryDb = getDefaultData();
  saveDatabase(memoryDb);
  return memoryDb;
}

function saveDatabase(data) {
  memoryDb = data;
  data.lastUpdated = new Date().toISOString();
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // On Vercel serverless, filesystem may be read-only; in-memory cache handles requests during instance lifecycle
    console.warn("Write to disk not allowed (serverless read-only filesystem), keeping in-memory state:", err.message);
  }
}

// ----------------- CRUD Operations -----------------

function getHabits() {
  const db = getDatabase();
  return db.habits || [];
}

function createHabit(habitData) {
  const db = getDatabase();
  const newHabit = {
    id: habitData.id || generateId(),
    title: habitData.title.trim(),
    category: habitData.category || "Health",
    icon: habitData.icon || "🎯",
    color: habitData.color || "#3b82f6",
    frequency: habitData.frequency || "daily",
    targetCount: Number(habitData.targetCount) || 1,
    unit: habitData.unit || "times",
    createdAt: new Date().toISOString()
  };
  db.habits = db.habits || [];
  db.habits.push(newHabit);
  saveDatabase(db);
  return newHabit;
}

function updateHabit(id, updateData) {
  const db = getDatabase();
  const idx = (db.habits || []).findIndex(h => h.id === id);
  if (idx === -1) return null;

  db.habits[idx] = {
    ...db.habits[idx],
    ...updateData,
    targetCount: updateData.targetCount !== undefined ? Number(updateData.targetCount) : db.habits[idx].targetCount
  };
  saveDatabase(db);
  return db.habits[idx];
}

function deleteHabit(id) {
  const db = getDatabase();
  db.habits = (db.habits || []).filter(h => h.id !== id);
  db.habitLogs = (db.habitLogs || []).filter(hl => hl.habitId !== id);
  saveDatabase(db);
  return true;
}

function getHabitLogs(startDate, endDate) {
  const db = getDatabase();
  let logs = db.habitLogs || [];
  if (startDate) logs = logs.filter(l => l.date >= startDate);
  if (endDate) logs = logs.filter(l => l.date <= endDate);
  return logs;
}

function toggleHabitLog(habitId, date, customValue, notes) {
  const db = getDatabase();
  db.habitLogs = db.habitLogs || [];
  const existingIdx = db.habitLogs.findIndex(l => l.habitId === habitId && l.date === date);

  if (existingIdx !== -1) {
    const current = db.habitLogs[existingIdx];
    if (customValue !== undefined && customValue !== null) {
      current.value = Number(customValue);
      current.completed = current.value > 0;
      if (notes !== undefined) current.notes = notes;
      saveDatabase(db);
      return current;
    } else {
      // Toggle
      current.completed = !current.completed;
      if (current.completed && current.value === 0) {
        const h = (db.habits || []).find(h => h.id === habitId);
        current.value = h ? h.targetCount : 1;
      }
      saveDatabase(db);
      return current;
    }
  } else {
    // Create new log entry
    const habit = (db.habits || []).find(h => h.id === habitId);
    const val = customValue !== undefined ? Number(customValue) : (habit ? habit.targetCount : 1);
    const newLog = {
      id: `hl-${date}-${habitId}`,
      habitId,
      date,
      completed: true,
      value: val,
      notes: notes || ""
    };
    db.habitLogs.push(newLog);
    saveDatabase(db);
    return newLog;
  }
}

function getSleepLogs(startDate, endDate) {
  const db = getDatabase();
  let logs = db.sleepLogs || [];
  if (startDate) logs = logs.filter(l => l.date >= startDate);
  if (endDate) logs = logs.filter(l => l.date <= endDate);
  // Sort descending by date
  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

function saveSleepLog(sleepData) {
  const db = getDatabase();
  db.sleepLogs = db.sleepLogs || [];
  const date = sleepData.date;
  const existingIdx = db.sleepLogs.findIndex(l => l.date === date);

  const duration = Number(sleepData.duration) || 8;
  const quality = Math.min(100, Math.max(1, Number(sleepData.quality) || 80));
  const deep = sleepData.deepSleepHours !== undefined ? Number(sleepData.deepSleepHours) : Math.round(duration * 0.22 * 10) / 10;
  const rem = sleepData.remSleepHours !== undefined ? Number(sleepData.remSleepHours) : Math.round(duration * 0.23 * 10) / 10;
  const light = Math.max(0, Math.round((duration - deep - rem) * 10) / 10);

  const entry = {
    id: sleepData.id || `sl-${date}`,
    date,
    bedtime: sleepData.bedtime || "23:00",
    wakeTime: sleepData.wakeTime || "07:00",
    duration,
    quality,
    deepSleepHours: deep,
    remSleepHours: rem,
    lightSleepHours: light,
    efficiency: Math.min(100, Math.max(50, Number(sleepData.efficiency) || Math.round(quality * 0.95 + 4))),
    factors: Array.isArray(sleepData.factors) ? sleepData.factors : [],
    moodOnWake: sleepData.moodOnWake || "refreshed",
    notes: sleepData.notes || ""
  };

  if (existingIdx !== -1) {
    db.sleepLogs[existingIdx] = entry;
  } else {
    db.sleepLogs.push(entry);
  }
  saveDatabase(db);
  return entry;
}

function deleteSleepLog(idOrDate) {
  const db = getDatabase();
  db.sleepLogs = (db.sleepLogs || []).filter(l => l.id !== idOrDate && l.date !== idOrDate);
  saveDatabase(db);
  return true;
}

// ----------------- Analytics Calculations -----------------

function calculateHabitStreaks(habits, habitLogs, referenceDateStr) {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date(2026, 9, 23);
  const streaks = {};

  habits.forEach(h => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let checkDate = new Date(refDate);

    // Calculate current streak backward from refDate
    for (let i = 0; i < 90; i++) {
      const dStr = formatDateLocal(checkDate);
      const log = habitLogs.find(l => l.habitId === h.id && l.date === dStr && l.completed);
      
      if (log) {
        currentStreak++;
      } else if (i === 0) {
        // Today might not be completed yet, check yesterday before breaking
        // continue to check yesterday
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak in entire dataset
    const sortedDates = habitLogs
      .filter(l => l.habitId === h.id && l.completed)
      .map(l => l.date)
      .sort();

    let prevDate = null;
    sortedDates.forEach(dStr => {
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const curr = new Date(dStr);
        const prev = new Date(prevDate);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevDate = dStr;
    });

    streaks[h.id] = {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak)
    };
  });

  return streaks;
}

function getDailyAnalytics(dateStr) {
  const db = getDatabase();
  const date = dateStr || formatDateLocal(new Date());
  const habits = db.habits || [];
  const logs = (db.habitLogs || []).filter(l => l.date === date);
  const sleep = (db.sleepLogs || []).find(l => l.date === date) || null;
  const streaks = calculateHabitStreaks(habits, db.habitLogs || [], date);

  const habitsWithStatus = habits.map(h => {
    const log = logs.find(l => l.habitId === h.id);
    return {
      ...h,
      completed: log ? log.completed : false,
      loggedValue: log ? log.value : 0,
      currentStreak: streaks[h.id] ? streaks[h.id].currentStreak : 0,
      longestStreak: streaks[h.id] ? streaks[h.id].longestStreak : 0,
      notes: log ? log.notes : ""
    };
  });

  const totalHabits = habits.length;
  const completedHabits = habitsWithStatus.filter(h => h.completed).length;
  const habitCompletionRate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

  // Daily Score: 50% sleep quality + 50% habit completion rate
  let dailyScore = 0;
  if (sleep && totalHabits > 0) {
    dailyScore = Math.round((sleep.quality * 0.5) + (habitCompletionRate * 0.5));
  } else if (sleep) {
    dailyScore = sleep.quality;
  } else {
    dailyScore = habitCompletionRate;
  }

  return {
    date,
    habits: habitsWithStatus,
    sleep,
    summary: {
      totalHabits,
      completedHabits,
      habitCompletionRate,
      sleepQuality: sleep ? sleep.quality : null,
      sleepDuration: sleep ? sleep.duration : null,
      sleepEfficiency: sleep ? sleep.efficiency : null,
      dailyScore
    }
  };
}

function getWeeklyAnalytics(referenceDateStr) {
  const db = getDatabase();
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date(2026, 9, 23);
  
  // Calculate start of week (Monday) and end of week (Sunday)
  const day = ref.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(formatDateLocal(d));
  }

  const startDate = days[0];
  const endDate = days[6];

  const habits = db.habits || [];
  const habitLogs = (db.habitLogs || []).filter(l => l.date >= startDate && l.date <= endDate);
  const sleepLogs = (db.sleepLogs || []).filter(l => l.date >= startDate && l.date <= endDate);

  // Daily breakdown
  const dailyBreakdown = days.map(dStr => {
    const dateObj = new Date(dStr);
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dateObj.getDay()];
    const dayHabitLogs = habitLogs.filter(l => l.date === dStr && l.completed);
    const daySleep = sleepLogs.find(l => l.date === dStr);

    const completionRate = habits.length > 0 ? Math.round((dayHabitLogs.length / habits.length) * 100) : 0;

    return {
      date: dStr,
      dayName,
      completedHabits: dayHabitLogs.length,
      totalHabits: habits.length,
      habitRate: completionRate,
      sleepDuration: daySleep ? daySleep.duration : 0,
      sleepQuality: daySleep ? daySleep.quality : 0,
      sleepEfficiency: daySleep ? daySleep.efficiency : 0,
      factors: daySleep ? daySleep.factors : []
    };
  });

  // Habit Matrix: Habit x 7 days
  const habitMatrix = habits.map(h => {
    const dayStatuses = days.map(dStr => {
      const log = habitLogs.find(l => l.habitId === h.id && l.date === dStr);
      return {
        date: dStr,
        completed: log ? log.completed : false,
        value: log ? log.value : 0
      };
    });
    const completedCount = dayStatuses.filter(ds => ds.completed).length;
    return {
      habitId: h.id,
      title: h.title,
      icon: h.icon,
      color: h.color,
      category: h.category,
      days: dayStatuses,
      weeklyCompleted: completedCount,
      weeklyRate: Math.round((completedCount / 7) * 100)
    };
  });

  // Weekly aggregates
  const validSleeps = sleepLogs.filter(s => s.duration > 0);
  const avgSleepDuration = validSleeps.length > 0
    ? Math.round((validSleeps.reduce((acc, s) => acc + s.duration, 0) / validSleeps.length) * 10) / 10
    : 0;
  const avgSleepQuality = validSleeps.length > 0
    ? Math.round(validSleeps.reduce((acc, s) => acc + s.quality, 0) / validSleeps.length)
    : 0;

  const targetSleepDuration = 8.0;
  const sleepDebt = validSleeps.length > 0
    ? Math.round(((targetSleepDuration * validSleeps.length) - validSleeps.reduce((acc, s) => acc + s.duration, 0)) * 10) / 10
    : 0;

  const totalPossibleChecks = habits.length * 7;
  const totalCompletedChecks = habitLogs.filter(l => l.completed).length;
  const overallHabitRate = totalPossibleChecks > 0 ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100) : 0;

  return {
    startDate,
    endDate,
    days,
    dailyBreakdown,
    habitMatrix,
    summary: {
      avgSleepDuration,
      avgSleepQuality,
      targetSleepDuration,
      sleepDebt, // positive = debt, negative = surplus
      overallHabitRate,
      totalCompletedChecks,
      totalPossibleChecks
    }
  };
}

function getMonthlyAnalytics(year, month) {
  const db = getDatabase();
  const y = Number(year) || 2026;
  const m = Number(month) || 10; // 1-12

  const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endOfMonth = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const habits = db.habits || [];
  const habitLogs = (db.habitLogs || []).filter(l => l.date >= startOfMonth && l.date <= endOfMonth);
  const sleepLogs = (db.sleepLogs || []).filter(l => l.date >= startOfMonth && l.date <= endOfMonth);

  // Calendar Heatmap Days (all days of month)
  const calendarDays = [];
  for (let i = 1; i <= lastDay; i++) {
    const dStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayHabits = habitLogs.filter(l => l.date === dStr && l.completed);
    const daySleep = sleepLogs.find(l => l.date === dStr);
    const habitRate = habits.length > 0 ? Math.round((dayHabits.length / habits.length) * 100) : 0;

    calendarDays.push({
      date: dStr,
      dayNumber: i,
      completedHabits: dayHabits.length,
      totalHabits: habits.length,
      habitRate,
      sleepDuration: daySleep ? daySleep.duration : null,
      sleepQuality: daySleep ? daySleep.quality : null,
      sleepEfficiency: daySleep ? daySleep.efficiency : null
    });
  }

  // Category breakdown
  const categoryStats = {};
  habits.forEach(h => {
    if (!categoryStats[h.category]) {
      categoryStats[h.category] = { category: h.category, completed: 0, totalPossible: 0 };
    }
    const completedForHabit = habitLogs.filter(l => l.habitId === h.id && l.completed).length;
    categoryStats[h.category].completed += completedForHabit;
    categoryStats[h.category].totalPossible += lastDay;
  });

  const categories = Object.values(categoryStats).map(c => ({
    ...c,
    rate: c.totalPossible > 0 ? Math.round((c.completed / c.totalPossible) * 100) : 0
  }));

  // Aggregates
  const validSleeps = sleepLogs.filter(s => s.duration > 0);
  const avgSleepDuration = validSleeps.length > 0
    ? Math.round((validSleeps.reduce((acc, s) => acc + s.duration, 0) / validSleeps.length) * 10) / 10
    : 0;
  const totalSleepHours = validSleeps.reduce((acc, s) => acc + s.duration, 0);
  const avgSleepQuality = validSleeps.length > 0
    ? Math.round(validSleeps.reduce((acc, s) => acc + s.quality, 0) / validSleeps.length)
    : 0;

  const totalCompletedHabits = habitLogs.filter(l => l.completed).length;
  const overallHabitRate = (habits.length * lastDay) > 0
    ? Math.round((totalCompletedHabits / (habits.length * lastDay)) * 100)
    : 0;

  return {
    year: y,
    month: m,
    totalDays: lastDay,
    calendarDays,
    categories,
    summary: {
      avgSleepDuration,
      totalSleepHours: Math.round(totalSleepHours * 10) / 10,
      avgSleepQuality,
      overallHabitRate,
      totalCompletedHabits,
      totalHabits: habits.length
    }
  };
}

function getInsightsAndCorrelations() {
  const db = getDatabase();
  const habits = db.habits || [];
  const habitLogs = db.habitLogs || [];
  const sleepLogs = db.sleepLogs || [];

  // Correlate each habit with sleep quality
  const correlations = habits.map(h => {
    let daysWithHabit = 0;
    let qualityWithHabitSum = 0;
    let daysWithoutHabit = 0;
    let qualityWithoutHabitSum = 0;

    sleepLogs.forEach(s => {
      const didHabit = habitLogs.some(hl => hl.habitId === h.id && hl.date === s.date && hl.completed);
      if (didHabit) {
        daysWithHabit++;
        qualityWithHabitSum += s.quality;
      } else {
        daysWithoutHabit++;
        qualityWithoutHabitSum += s.quality;
      }
    });

    const avgWith = daysWithHabit > 0 ? Math.round(qualityWithHabitSum / daysWithHabit) : 0;
    const avgWithout = daysWithoutHabit > 0 ? Math.round(qualityWithoutHabitSum / daysWithoutHabit) : 0;
    const impact = avgWith - avgWithout;

    return {
      habitId: h.id,
      title: h.title,
      icon: h.icon,
      color: h.color,
      daysWithHabit,
      daysWithoutHabit,
      avgQualityWith: avgWith,
      avgQualityWithout: avgWithout,
      impact // Positive means boosts sleep score
    };
  }).sort((a, b) => b.impact - a.impact);

  // Chronotype & Weekend vs Weekday analysis
  let weekdayQualitySum = 0, weekdayCount = 0;
  let weekendQualitySum = 0, weekendCount = 0;
  let weekdayDurationSum = 0;
  let weekendDurationSum = 0;

  sleepLogs.forEach(s => {
    const d = new Date(s.date);
    const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
    if (isWeekend) {
      weekendQualitySum += s.quality;
      weekendDurationSum += s.duration;
      weekendCount++;
    } else {
      weekdayQualitySum += s.quality;
      weekdayDurationSum += s.duration;
      weekdayCount++;
    }
  });

  const weekdayAvgQuality = weekdayCount > 0 ? Math.round(weekdayQualitySum / weekdayCount) : 0;
  const weekendAvgQuality = weekendCount > 0 ? Math.round(weekendQualitySum / weekendCount) : 0;
  const weekdayAvgDuration = weekdayCount > 0 ? Math.round((weekdayDurationSum / weekdayCount) * 10) / 10 : 0;
  const weekendAvgDuration = weekendCount > 0 ? Math.round((weekendDurationSum / weekendCount) * 10) / 10 : 0;

  // Key actionable insights
  const recommendations = [];
  const topHabit = correlations[0];
  if (topHabit && topHabit.impact > 0) {
    recommendations.push({
      type: "boost",
      title: `Supercharge Sleep with ${topHabit.title}`,
      description: `Completing "${topHabit.title}" raises your average sleep quality by +${topHabit.impact}% (${topHabit.avgQualityWith}% vs ${topHabit.avgQualityWithout}%). Prioritize this before bedtime.`
    });
  }

  const noScreenHabit = correlations.find(c => c.habitId === "h-6");
  if (noScreenHabit && noScreenHabit.impact > 0) {
    recommendations.push({
      type: "recovery",
      title: "Screen Detox Wind-Down",
      description: `Days without late screen time yield deep restorative sleep cycles with an average sleep score of ${noScreenHabit.avgQualityWith}%. Keep phones charging outside the bedroom.`
    });
  }

  const socialJetlag = Math.abs(weekendAvgDuration - weekdayAvgDuration);
  if (socialJetlag >= 0.7) {
    recommendations.push({
      type: "circadian",
      title: "Circadian Rhythm Stabilization",
      description: `You sleep ${weekendAvgDuration}h on weekends vs ${weekdayAvgDuration}h on weekdays (${socialJetlag}h variance). Aligning wake times within 45 mins stabilizes melatonin cycles.`
    });
  } else {
    recommendations.push({
      type: "circadian",
      title: "Consistent Sleep Schedule",
      description: `Excellent schedule consistency! Your weekday (${weekdayAvgDuration}h) and weekend (${weekendAvgDuration}h) durations are tightly synchronized.`
    });
  }

  return {
    correlations,
    chronotype: {
      weekdayAvgQuality,
      weekendAvgQuality,
      weekdayAvgDuration,
      weekendAvgDuration,
      socialJetlag: Math.round(socialJetlag * 10) / 10
    },
    recommendations
  };
}

module.exports = {
  getDatabase,
  saveDatabase,
  getDefaultData,
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitLogs,
  toggleHabitLog,
  getSleepLogs,
  saveSleepLog,
  deleteSleepLog,
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getInsightsAndCorrelations
};
