# 🚀 Vercel Deployment Instructions

This folder (`deployment/`) contains the complete standalone, self-contained project ready for instant deployment to Vercel.

---

### Option 1: Deploy with Vercel CLI (Fastest)

1. Open your terminal in this `deployment` directory:
   ```bash
   cd deployment
   ```
2. Run:
   ```bash
   npx vercel
   ```
   Or for production:
   ```bash
   npx vercel --prod
   ```
3. Follow the simple prompts (accept the defaults). Vercel will deploy the site and provide a live URL in seconds!

---

### Option 2: Deploy with GitHub & Vercel Web Dashboard (1-Click)

1. Open your terminal in this `deployment` directory:
   ```bash
   cd deployment
   git init
   git add .
   git commit -m "Deploy HabitPulse & Somna tracker"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to **[vercel.com/new](https://vercel.com/new)**.
3. Import your new GitHub repository.
4. Keep all default settings and click **Deploy**.
5. Your application will be live globally!

---

### Files Included:
- **`vercel.json`**: Vercel configuration for API serverless routes and static assets.
- **`api/`**: All Vercel Serverless Functions (`analytics.js`, `habits.js`, `sleep.js`, `insights.js`, `seed.js`, `backup.js`, `_db.js`).
- **`public/`**: Static web frontend (`index.html`, `css/style.css`, `js/app.js`, `js/api.js`, `js/charts.js`).
- **`data/`**: Initial pre-seeded database with 35 days of sample records (`database.json`).
- **`package.json`**: Project metadata and start script.
- **`server.js`**: Zero-dependency local server runner.
