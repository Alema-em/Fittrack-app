# FitTrack — DBMS Course Project

## Quick Start

```bash
# Step 1: Load the database
mysql -u root -p < fitness-project.sql

# Step 2: Grant all permissions (fixes DELETE errors)
mysql -u root -p -e "
  GRANT ALL PRIVILEGES ON fittrack.* TO 'admin_user'@'localhost';
  GRANT EXECUTE ON fittrack.* TO 'app_user'@'localhost';
  FLUSH PRIVILEGES;
"

# Step 3: Backend (Terminal 1)
cd backend
cp .env.example .env
npm install
node server.js

# Step 4: Frontend (Terminal 2)
cd frontend
npm install
npm run dev
# → Open http://localhost:5173
```

## If you get "DELETE command denied" error
Run this in MySQL:
```sql
GRANT ALL PRIVILEGES ON fittrack.* TO 'admin_user'@'localhost';
FLUSH PRIVILEGES;
```

## Demo accounts (any password works)
- meher@email.com — Strength · Week 5
- akshay@email.com — Strength · Week 8
- siya@email.com — Hypertrophy · Week 3

## What's connected to MySQL
- Login / Register → CALL RegisterUser() stored procedure
- Sessions → SESSION_TEMPLATE + SESSION_EXERCISE + EXERCISE + ONE_REP_MAX
- Add exercise to session → INSERT INTO SESSION_EXERCISE
- Remove from session → DELETE FROM SESSION_EXERCISE (CASCADE)
- Create custom exercise → INSERT INTO EXERCISE (is_custom=TRUE)
- Delete custom exercise → DELETE FROM EXERCISE
- Log workout → CALL LogWorkout() stored procedure
- Advance week → CALL AdvanceWeek() stored procedure
- Update 1RM → INSERT INTO ONE_REP_MAX (history preserved)
- Stats → ProgressTrackingView + ExerciseSummaryView + WORKOUT_LOG
- Database tab (demo only) → Live Q1/Q2/Q3 results + table counts

## Database tab
Only visible to demo users. Regular accounts never see it.
