// Persistent JSON Database Engine for Habit & Sleep Tracker
// Supports Multi-User Authentication, Personal Tracker Data Isolation,
// Local Development, and Vercel Serverless Function Deployment
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');
const TMP_DB_PATH = path.join(os.tmpdir(), 'somna_database.json');
const AUTH_SECRET = process.env.AUTH_SECRET || 'somna-habitpulse-secure-secret-key-2026';

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

// ----------------- Password & Token Helpers -----------------

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const computed = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return computed === hash;
}

function createToken(userId) {
  const payload = `${userId}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 3) return null;
    const userId = parts[0];
    const timestamp = parts[1];
    const sig = parts.slice(2).join(':');

    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(`${userId}:${timestamp}`).digest('hex');
    if (sig === expectedSig) {
      return userId;
    }
  } catch (e) {}
  return null;
}

function getUserIdFromRequest(req) {
  // 1. Authorization Header: Bearer <token>
  const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const uid = verifyToken(token);
    if (uid) return uid;
  }

  // 2. Custom header x-auth-token
  const customHeader = req.headers && req.headers['x-auth-token'];
  if (customHeader) {
    const uid = verifyToken(customHeader);
    if (uid) return uid;
  }

  // 3. Query string token parameter
  if (req.query && req.query.token) {
    const uid = verifyToken(req.query.token);
    if (uid) return uid;
  }

  // Fallback to demo user for unauthenticated guest preview
  return "u-demo";
}

// ----------------- Starter Habit Templates -----------------

function getStarterHabitsForUser(userId) {
  return [
    {
      id: generateId(),
      userId,
      title: "Morning Sunlight & Walk",
      category: "Health",
      icon: "☀️",
      color: "#f59e0b",
      frequency: "daily",
      targetCount: 20,
      unit: "min",
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      userId,
      title: "Exercise / Workout",
      category: "Fitness",
      icon: "🏋️",
      color: "#ef4444",
      frequency: "daily",
      targetCount: 45,
      unit: "min",
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      userId,
      title: "Mindful Meditation",
      category: "Mindfulness",
      icon: "🧘",
      color: "#8b5cf6",
      frequency: "daily",
      targetCount: 15,
      unit: "min",
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      userId,
      title: "Drink 2.5L Water",
      category: "Health",
      icon: "💧",
      color: "#06b6d4",
      frequency: "daily",
      targetCount: 2.5,
      unit: "L",
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      userId,
      title: "Read Book",
      category: "Learning",
      icon: "📖",
      color: "#3b82f6",
      frequency: "daily",
      targetCount: 20,
      unit: "pages",
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      userId,
      title: "No Screen 45m Before Bed",
      category: "Sleep",
      icon: "🌙",
      color: "#10b981",
      frequency: "daily",
      targetCount: 1,
      unit: "check",
      createdAt: new Date().toISOString()
    }
  ];
}

function getDefaultData() {
  const demoUserId = "u-demo";
  const { hash, salt } = hashPassword("demo123");

  const users = [
    {
      id: demoUserId,
      name: "Demo Explorer",
      email: "demo@example.com",
      passwordHash: hash,
      salt: salt,
      createdAt: "2026-09-01T08:00:00Z"
    }
  ];

  const habits = [
    {
      id: "h-1",
      userId: demoUserId,
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
      userId: demoUserId,
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
      userId: demoUserId,
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
      userId: demoUserId,
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
      userId: demoUserId,
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
      userId: demoUserId,
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

  const habitLogs = [];
  const sleepLogs = [];
  const today = new Date(2026, 9, 23);

  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateLocal(d);

    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isGoodDay = (i % 7 !== 2 && i % 7 !== 5);

    habits.forEach((habit, hIdx) => {
      let completed = false;
      const rand = (Math.sin(i * 13 + hIdx * 7) + 1) / 2;
      if (hIdx === 0) completed = rand > 0.25;
      if (hIdx === 1) completed = isWeekend ? rand > 0.4 : rand > 0.3;
      if (hIdx === 2) completed = rand > 0.35;
      if (hIdx === 3) completed = rand > 0.2;
      if (hIdx === 4) completed = rand > 0.3;
      if (hIdx === 5) completed = isGoodDay ? rand > 0.25 : rand > 0.65;

      if (completed) {
        habitLogs.push({
          id: `hl-${dateStr}-${habit.id}`,
          userId: demoUserId,
          habitId: habit.id,
          date: dateStr,
          completed: true,
          value: habit.targetCount,
          notes: completed ? "Accomplished target" : ""
        });
      }
    });

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
    if (didMeditate) quality += 4;
    if (isWeekend) {
      bedtime = "23:45";
      wakeTime = "07:45";
      duration += 0.5;
    }

    const noise = ((Math.sin(i * 5) + 1) / 2) * 8 - 4;
    quality = Math.max(52, Math.min(98, Math.round(quality + noise)));
    duration = Math.max(5.5, Math.min(9.5, Math.round((duration + (noise / 10)) * 10) / 10));

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
      userId: demoUserId,
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
    version: "2.0.0",
    lastUpdated: new Date().toISOString(),
    users,
    habits,
    habitLogs,
    sleepLogs
  };
}

function getDatabase() {
  if (memoryDb) {
    return memoryDb;
  }

  // 1. Try reading from TMP_DB_PATH (writable persistent storage on Vercel)
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      const content = fs.readFileSync(TMP_DB_PATH, 'utf-8');
      memoryDb = JSON.parse(content);
      if (!memoryDb.users) memoryDb.users = [];
      return memoryDb;
    }
  } catch (err) {
    // Ignore and fallback
  }

  // 2. Try reading from DB_PATH (local file or bundled deployment file)
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      memoryDb = JSON.parse(content);
      if (!memoryDb.users) memoryDb.users = [];
      return memoryDb;
    }
  } catch (err) {
    console.warn("Could not read database from disk, using fallback:", err.message);
  }

  // 3. Fallback to default template
  memoryDb = getDefaultData();
  saveDatabase(memoryDb);
  return memoryDb;
}

function saveDatabase(data) {
  memoryDb = data;
  data.lastUpdated = new Date().toISOString();

  // Try writing to primary DB_PATH (local development)
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Expected on read-only serverless filesystems
  }

  // Always write to TMP_DB_PATH (guaranteed writable on Vercel)
  try {
    fs.writeFileSync(TMP_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not write to TMP_DB_PATH:", err.message);
  }
}

// ----------------- User Authentication Operations -----------------

function registerUser(name, email, password) {
  const db = getDatabase();
  db.users = db.users || [];

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const { hash, salt } = hashPassword(password);
  const userId = `u-${generateId()}`;

  const newUser = {
    id: userId,
    name: name.trim(),
    email: cleanEmail,
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // Automatically initialize starter habits for the new user
  const starterHabits = getStarterHabitsForUser(userId);
  db.habits = db.habits || [];
  db.habits.push(...starterHabits);

  saveDatabase(db);

  const token = createToken(userId);
  return {
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
    token
  };
}

function authenticateUser(email, password) {
  const db = getDatabase();
  db.users = db.users || [];

  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  const token = createToken(user.id);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    token
  };
}

function getUserById(userId) {
  const db = getDatabase();
  const user = (db.users || []).find(u => u.id === userId);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email };
}

function restoreOrRegisterUser(name, email, password, userData) {
  const db = getDatabase();
  db.users = db.users || [];

  const cleanEmail = email.trim().toLowerCase();
  let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (user) {
    if (user.passwordHash && user.salt) {
      const valid = verifyPassword(password, user.passwordHash, user.salt);
      if (!valid) {
        throw new Error('Incorrect password for this account.');
      }
    }
  } else {
    const { hash, salt } = hashPassword(password);
    const userId = `u-${generateId()}`;
    user = {
      id: userId,
      name: name ? name.trim() : 'User',
      email: cleanEmail,
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);

    const starterHabits = getStarterHabitsForUser(userId);
    db.habits = db.habits || [];
    db.habits.push(...starterHabits);
  }

  if (userData) {
    syncUserData(user.id, userData);
  } else {
    saveDatabase(db);
  }

  const token = createToken(user.id);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    token
  };
}

function restoreSession(userId, name, email, userData) {
  const db = getDatabase();
  db.users = db.users || [];

  const cleanEmail = (email || '').trim().toLowerCase();
  let user = db.users.find(u => u.id === userId || (cleanEmail && u.email.toLowerCase() === cleanEmail));

  if (!user) {
    user = {
      id: userId,
      name: name || 'User',
      email: cleanEmail,
      passwordHash: '',
      salt: '',
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    const starterHabits = getStarterHabitsForUser(userId);
    db.habits = db.habits || [];
    db.habits.push(...starterHabits);
  }

  if (userData) {
    syncUserData(user.id, userData);
  } else {
    saveDatabase(db);
  }

  const token = createToken(user.id);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    token
  };
}

// ----------------- Per-User CRUD Operations -----------------

function getHabits(userId) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";
  return (db.habits || []).filter(h => (h.userId || "u-demo") === targetUser);
}

function createHabit(userId, habitData) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";

  const newHabit = {
    id: habitData.id || generateId(),
    userId: targetUser,
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

function updateHabit(userId, id, updateData) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";
  const idx = (db.habits || []).findIndex(h => h.id === id && (h.userId || "u-demo") === targetUser);
  if (idx === -1) return null;

  db.habits[idx] = {
    ...db.habits[idx],
    ...updateData,
    targetCount: updateData.targetCount !== undefined ? Number(updateData.targetCount) : db.habits[idx].targetCount
  };
  saveDatabase(db);
  return db.habits[idx];
}

function deleteHabit(userId, id) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";
  db.habits = (db.habits || []).filter(h => !(h.id === id && (h.userId || "u-demo") === targetUser));
  db.habitLogs = (db.habitLogs || []).filter(hl => !(hl.habitId === id && (hl.userId || "u-demo") === targetUser));
  saveDatabase(db);
  return true;
}

function getHabitLogs(userId, startDate, endDate) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";
  let logs = (db.habitLogs || []).filter(l => (l.userId || "u-demo") === targetUser);
  if (startDate) logs = logs.filter(l => l.date >= startDate);
  if (endDate) logs = logs.filter(l => l.date <= endDate);
  return logs;
}

function toggleHabitLog(userId, habitId, date, customValue, notes) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";
  db.habitLogs = db.habitLogs || [];

  const existingIdx = db.habitLogs.findIndex(l => (l.userId || "u-demo") === targetUser && l.habitId === habitId && l.date === date);

  if (existingIdx !== -1) {
    const current = db.habitLogs[existingIdx];
    if (customValue !== undefined && customValue !== null) {
      current.value = Number(customValue);
      current.completed = current.value > 0;
      if (notes !== undefined) current.notes = notes;
      saveDatabase(db);
      return current;
    } else {
      current.completed = !current.completed;
      if (current.completed && current.value === 0) {
        const h = (db.habits || []).find(h => h.id === habitId);
        current.value = h ? h.targetCount : 1;
      }
      saveDatabase(db);
      return current;
    }
  } else {
    const habit = (db.habits || []).find(h => h.id === habitId);
    const val = customValue !== undefined ? Number(customValue) : (habit ? habit.targetCount : 1);
    const newLog = {
      id: `hl-${date}-${habitId}`,
      userId: targetUser,
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

function getSleepLogs(userId, startDate, endDate) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";
  let logs = (db.sleepLogs || []).filter(l => (l.userId || "u-demo") === targetUser);
  if (startDate) logs = logs.filter(l => l.date >= startDate);
  if (endDate) logs = logs.filter(l => l.date <= endDate);
  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

function saveSleepLog(userId, sleepData) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";
  db.sleepLogs = db.sleepLogs || [];
  const date = sleepData.date;

  const existingIdx = db.sleepLogs.findIndex(l => (l.userId || "u-demo") === targetUser && l.date === date);

  const duration = Number(sleepData.duration) || 8;
  const quality = Math.min(100, Math.max(1, Number(sleepData.quality) || 80));
  const deep = sleepData.deepSleepHours !== undefined ? Number(sleepData.deepSleepHours) : Math.round(duration * 0.22 * 10) / 10;
  const rem = sleepData.remSleepHours !== undefined ? Number(sleepData.remSleepHours) : Math.round(duration * 0.23 * 10) / 10;
  const light = Math.max(0, Math.round((duration - deep - rem) * 10) / 10);

  const entry = {
    id: sleepData.id || `sl-${date}`,
    userId: targetUser,
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

function deleteSleepLog(userId, idOrDate) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";
  db.sleepLogs = (db.sleepLogs || []).filter(l => (l.userId || "u-demo") === targetUser && l.id !== idOrDate && l.date !== idOrDate);
  saveDatabase(db);
  return true;
}

// ----------------- Per-User Analytics -----------------

function calculateHabitStreaks(habits, habitLogs, referenceDateStr) {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date(2026, 9, 23);
  const streaks = {};

  habits.forEach(h => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let checkDate = new Date(refDate);

    for (let i = 0; i < 90; i++) {
      const dStr = formatDateLocal(checkDate);
      const log = habitLogs.find(l => l.habitId === h.id && l.date === dStr && l.completed);

      if (log) {
        currentStreak++;
      } else if (i === 0) {
        // Today might not be completed yet
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

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

function getDailyAnalytics(userId, dateStr) {
  const targetUser = userId || "u-demo";
  const date = dateStr || formatDateLocal(new Date());
  const habits = getHabits(targetUser);
  const logs = getHabitLogs(targetUser, date, date);
  const userSleeps = getSleepLogs(targetUser, date, date);
  const sleep = userSleeps.find(l => l.date === date) || null;
  const streaks = calculateHabitStreaks(habits, getHabitLogs(targetUser), date);

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

function getWeeklyAnalytics(userId, referenceDateStr) {
  const targetUser = userId || "u-demo";
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date(2026, 9, 23);

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

  const habits = getHabits(targetUser);
  const habitLogs = getHabitLogs(targetUser, startDate, endDate);
  const sleepLogs = getSleepLogs(targetUser, startDate, endDate);

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
      sleepDebt,
      overallHabitRate,
      totalCompletedChecks,
      totalPossibleChecks
    }
  };
}

function getMonthlyAnalytics(userId, year, month) {
  const targetUser = userId || "u-demo";
  const y = Number(year) || 2026;
  const m = Number(month) || 10;

  const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endOfMonth = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const habits = getHabits(targetUser);
  const habitLogs = getHabitLogs(targetUser, startOfMonth, endOfMonth);
  const sleepLogs = getSleepLogs(targetUser, startOfMonth, endOfMonth);

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

function getInsightsAndCorrelations(userId) {
  const targetUser = userId || "u-demo";
  const habits = getHabits(targetUser);
  const habitLogs = getHabitLogs(targetUser);
  const sleepLogs = getSleepLogs(targetUser);

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
      impact
    };
  }).sort((a, b) => b.impact - a.impact);

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

  const recommendations = [];
  const topHabit = correlations[0];
  if (topHabit && topHabit.impact > 0) {
    recommendations.push({
      type: "boost",
      title: `Supercharge Sleep with ${topHabit.title}`,
      description: `Completing "${topHabit.title}" raises your average sleep quality by +${topHabit.impact}% (${topHabit.avgQualityWith}% vs ${topHabit.avgQualityWithout}%). Prioritize this before bedtime.`
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

// ----------------- Per-User Sync Operations -----------------

function getUserData(userId) {
  const targetUser = userId || "u-demo";
  return {
    habits: getHabits(targetUser),
    habitLogs: getHabitLogs(targetUser),
    sleepLogs: getSleepLogs(targetUser)
  };
}

function syncUserData(userId, payload) {
  const db = getDatabase();
  const targetUser = userId || "u-demo";
  if (!payload) return getUserData(targetUser);

  if (Array.isArray(payload.habits) && payload.habits.length > 0) {
    db.habits = (db.habits || []).filter(h => (h.userId || "u-demo") !== targetUser);
    payload.habits.forEach(h => {
      db.habits.push({ ...h, userId: targetUser });
    });
  }

  if (Array.isArray(payload.habitLogs)) {
    db.habitLogs = (db.habitLogs || []).filter(hl => (hl.userId || "u-demo") !== targetUser);
    payload.habitLogs.forEach(hl => {
      db.habitLogs.push({ ...hl, userId: targetUser });
    });
  }

  if (Array.isArray(payload.sleepLogs)) {
    db.sleepLogs = (db.sleepLogs || []).filter(sl => (sl.userId || "u-demo") !== targetUser);
    payload.sleepLogs.forEach(sl => {
      db.sleepLogs.push({ ...sl, userId: targetUser });
    });
  }

  saveDatabase(db);
  return getUserData(targetUser);
}

module.exports = {
  getDatabase,
  saveDatabase,
  getDefaultData,
  registerUser,
  authenticateUser,
  getUserById,
  createToken,
  verifyToken,
  getUserIdFromRequest,
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
  getInsightsAndCorrelations,
  getUserData,
  syncUserData,
  restoreOrRegisterUser,
  restoreSession
};
