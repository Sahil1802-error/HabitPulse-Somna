# HabitPulse & Somna ⚡🌙
### Habit & Sleep Tracking & Analytics Web Application (Daily, Weekly & Monthly)

A full-stack, zero-external-dependency web application designed for tracking habits, logging sleep architecture, and analyzing their statistical correlations on a **daily**, **weekly**, and **monthly** basis. 

Pre-configured and **100% ready for instant deployment to Vercel** or immediate local execution.

---

## 🌟 Key Features

### 1. 📅 Daily Dashboard
- **Daily Balance Score (0–100%)**: Composite health score weighting habit completion (50%) and sleep quality (50%).
- **Interactive Habit Checklist**: 1-click toggling, current streak tracking (`🔥`), target value meters, category tags, and particle celebration confetti.
- **Sleep Architecture Visualization**: Visual breakdown of **Deep Sleep**, **REM Sleep**, and **Light Sleep** durations and percentages.
- **Lifestyle Factor Tags**: Tracks late screen time, late caffeine, exercise, cool room, and meditation factors.
- **Circadian Coaching Advice**: Personalized daily tips based on chronobiology.

### 2. 📊 Weekly Analytics
- **7-Day Sleep Duration vs Target Chart**: Interactive SVG bar graph comparing actual hours slept against the 8.0h target line.
- **Sleep Debt / Surplus Calculation**: Quantifies weekly sleep debt against a 56-hour restorative baseline.
- **Quality Trend Curves**: Dual-axis trend graph visualizing how habit adherence correlates with sleep quality shifts.
- **Weekly Habit Adherence Matrix**: Heatmap grid mapping every habit against Monday through Sunday with completion rates.

### 3. 🗓️ Monthly Analytics
- **Monthly Heatmap Calendar**: GitHub-style calendar matrix displaying daily habit completion percentages and sleep scores. Click any date cell to jump directly to that day's log.
- **Category Distribution**: Adherence progress bars grouped by Health, Fitness, Mindfulness, Learning, Productivity, and Sleep.
- **Aggregate Metrics**: Total hours slept this month, total habits checked off, average sleep quality, and monthly adherence rate.

### 4. ✨ Correlation & Insights Engine
- **"How Habits Impact Sleep" Correlation Table**: Statistical analysis measuring the exact percentage difference in sleep quality on days a habit was completed versus skipped (e.g. `+16%` sleep score boost from *"No Screen 45m Before Bed"*).
- **Chronotype & Social Jetlag Analysis**: Compares weekday sleep duration vs weekend sleep duration to detect circadian misalignment.
- **Personalized Recommendations**: Actionable insights generated from historical habits and sleep quality data.

### 5. ⚙️ Data Management & Persistence
- **Pre-seeded Realistic History**: Includes 35 days of pre-populated historical habit and sleep records.
- **Export & Backup**: 1-click export of the entire database to a clean JSON file.
- **Restore / Import**: Upload backup files to restore or sync state.
- **Theme Support**: Seamless dark/light mode toggle with preference persistence in `localStorage`.

---

## 🚀 Instant Deployment to Vercel

This application is built according to Vercel's native Serverless architecture. No build step or package installations are required on your local machine.

### Method 1: Deploy via GitHub (Recommended)
1. Initialize a git repository and push your project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of HabitPulse & Somna"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your GitHub repository.
4. Keep the default settings and click **Deploy**.
5. Vercel automatically deploys the `/api` directory as Serverless Functions and serves `/public` as static assets in ~15 seconds!

### Method 2: Deploy via Vercel CLI
```bash
npx vercel
```
Or for production:
```bash
npx vercel --prod
```

---

## 💻 Running Locally (Zero Dependencies)

The project includes a lightweight, built-in development server built exclusively with Node.js standard libraries (`http`, `fs`, `path`, `url`, `crypto`). **No external `npm install` packages are required!**

```bash
# Start the server
node server.js
```
or
```bash
npm start
```

Then open your browser and navigate to:
```
http://localhost:3000
```

---

## 🛠️ Architecture & Project Structure

```
├── api/                           # Vercel Serverless Functions
│   ├── _db.js                     # In-memory + JSON persistence engine & analytics math
│   ├── habits.js                  # GET, POST, PUT, DELETE /api/habits
│   ├── habit-toggle.js            # POST /api/habit-toggle
│   ├── sleep.js                   # GET, POST, DELETE /api/sleep
│   ├── analytics.js               # GET /api/analytics (daily, weekly, monthly)
│   ├── insights.js                # GET /api/insights (habit-sleep correlations)
│   ├── seed.js                    # POST /api/seed (re-seeds 35 days of history)
│   └── backup.js                  # GET/POST /api/backup (JSON export/import)
├── data/
│   └── database.json              # Persistent database file pre-seeded with sample data
├── public/
│   ├── index.html                 # Main dashboard interface
│   ├── css/
│   │   └── style.css              # Glassmorphic UI with CSS variables & responsive design
│   └── js/
│       ├── api.js                 # Frontend API client
│       ├── charts.js              # Pure SVG/Canvas interactive charts & confetti
│       └── app.js                 # Dashboard state manager & UI controller
├── server.js                      # Zero-dependency local Node.js server
├── vercel.json                    # Vercel routing, rewrites, and CORS headers
└── package.json                   # Project metadata and start script
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/habits` | `GET` | List all habits with current & longest streaks |
| `/api/habits` | `POST` | Create a new habit (`title`, `category`, `icon`, `targetCount`, `unit`) |
| `/api/habits?id=:id` | `PUT` | Update an existing habit |
| `/api/habits?id=:id` | `DELETE` | Delete a habit and its historical logs |
| `/api/habit-toggle` | `POST` | Toggle completion status for a habit on a given date |
| `/api/sleep` | `GET` | Retrieve sleep logs (optional `startDate`, `endDate`) |
| `/api/sleep` | `POST` | Log or update a sleep record (`date`, `duration`, `quality`, `factors`, `mood`) |
| `/api/sleep?date=:date` | `DELETE` | Remove a sleep log |
| `/api/analytics?view=daily&date=YYYY-MM-DD` | `GET` | Get daily scores, habit checklist, and sleep architecture |
| `/api/analytics?view=weekly&date=YYYY-MM-DD` | `GET` | Get 7-day breakdown, sleep debt, and habit matrix |
| `/api/analytics?view=monthly&year=YYYY&month=MM` | `GET` | Get monthly calendar heatmap and category breakdown |
| `/api/insights` | `GET` | Statistical correlations between habits and sleep quality |
| `/api/seed` | `POST` | Reset and generate fresh 35-day historical dataset |
| `/api/backup` | `GET` / `POST` | Export or restore the complete database in JSON format |

---

## 🛡️ License
MIT License. Created for seamless tracking, analytics, and Vercel cloud deployment.
