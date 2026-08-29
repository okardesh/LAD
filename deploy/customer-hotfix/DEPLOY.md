# Customer hotfix — RPA dashboard Jobs upload + hourly charts

Target: `C:\LAD` (contains `smartaggregator\` = backend, `smartaggregator-ui\` = frontend).
Recommended path: **fresh DB** (fine while testing — wipes all data, reseeds `admin` / `123456`).

## What this fixes
- Jobs upload kept its time component and its `dataDate`, so daily-intensity is
  generated → working-hour / hourly-runtime charts populate.
- Upload survives bad rows, shows a progress bar, never hard-aborts.
- "Daily Intensity" removed from the manual upload dropdown (auto-derived).
- Hourly chart x-axis labels no longer overlap.
- Wider DB columns for real UiPath exports.

---

## Steps

Assume this bundle is copied to `C:\LAD\hotfix\`.

### 1. Stop both services
Stop the frontend (`pm2 stop app`, or the Windows task, or close its window) and
the backend.

### 2. Backend jar
```cmd
cd C:\LAD\smartaggregator
ren smartaggregator.jar smartaggregator.jar.pre-hotfix
copy C:\LAD\hotfix\smartaggregator\smartaggregator.jar  smartaggregator.jar
```
(Whole jar = the customer's build + the one patched class. If you must keep their
exact jar and have a JDK: instead run
`jar uf smartaggregator.jar -C C:\LAD\hotfix\smartaggregator BOOT-INF\classes\com\linktera\rpadashboard\component\impl\AsyncImpl.class`)

### 3. Backend config + launcher
```cmd
copy /Y C:\LAD\hotfix\smartaggregator\config\data.sql     C:\LAD\smartaggregator\config\data.sql
copy /Y C:\LAD\hotfix\smartaggregator\start_backend.cmd   C:\LAD\smartaggregator\start_backend.cmd
```

### 4. Delete the database
```cmd
dir /s /b C:\LAD\*.mv.db
del C:\LAD\smartaggregator\smartaggregator-db.mv.db
del C:\LAD\smartaggregator\smartaggregator-db.trace.db
```
(If `dir` shows the `.mv.db` somewhere else, delete it there.)

### 5. Frontend — 6 files into `C:\LAD\smartaggregator-ui\app\`
```cmd
copy /Y C:\LAD\hotfix\smartaggregator-ui\app\rest\api.js                    C:\LAD\smartaggregator-ui\app\rest\
copy /Y C:\LAD\hotfix\smartaggregator-ui\app\controllers\rpa-dashboard.js   C:\LAD\smartaggregator-ui\app\controllers\
copy /Y C:\LAD\hotfix\smartaggregator-ui\app\views\pages\rpa-dashboard.pug  C:\LAD\smartaggregator-ui\app\views\pages\
copy /Y C:\LAD\hotfix\smartaggregator-ui\app\views\partials\rpad-chart5.pug C:\LAD\smartaggregator-ui\app\views\partials\
copy /Y C:\LAD\hotfix\smartaggregator-ui\app\locales\en.json               C:\LAD\smartaggregator-ui\app\locales\
copy /Y C:\LAD\hotfix\smartaggregator-ui\app\locales\tr.json               C:\LAD\smartaggregator-ui\app\locales\
```
No `npm install` needed.

### 6. Start the backend
```cmd
C:\LAD\smartaggregator\start_backend.cmd
```
Wait for `Started Application`. It listens on 8080. On this fresh DB the login is
`admin` / `123456` (also `okardes` / `123456`).

### 7. Start the frontend
Your normal way (`pm2 start app` / the task), or:
```cmd
C:\LAD\smartaggregator-ui\app\start_frontend.cmd
```
It listens on 8082.

### 8. Verify in the browser
1. Log in (`admin` / `123456`).
2. RPA dashboard → upload the **Jobs** Excel → progress bar runs → completes.
3. Upload the **Queues** Excel.
4. Working-hour utilization / hourly robot runtime charts show bars; hour labels
   are readable.

> Uploads **append**. Re-importing the same period without clearing `RPAD_JOBS` /
> `RPAD_DAILY_INTENSITY` first will double the rows.

---

## Keeping the existing data instead

If you must not wipe: skip steps 3–4, keep the old `data.sql` and launcher, and
with the backend stopped run the column widening once:
```cmd
cd C:\LAD\smartaggregator
java -cp lib\h2-1.4.200.jar org.h2.tools.RunScript -url "jdbc:h2:file:./smartaggregator-db" -user sa -script C:\LAD\hotfix\schema-upgrade.sql
```
This only works if your current launcher already loads the H2 driver and runs
from a working dir where `smartaggregator-db` resolves.
