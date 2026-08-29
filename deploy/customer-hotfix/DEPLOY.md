# Customer hotfix — RPA dashboard Jobs upload + hourly charts

Target: `C:\LAD` with `smartaggregator\` (backend) and `smartaggregator-ui\` (frontend).

## What this fixes
- Jobs upload no longer strips `dataDate` / truncates job times → daily-intensity
  data is generated, so the working-hour / hourly-runtime charts populate.
- Upload is resilient to bad rows and shows a progress bar.
- "Daily Intensity" removed from the manual upload dropdown (auto-derived).
- Hourly chart x-axis labels no longer overlap.
- Wider DB columns for real UiPath exports.

---

## 1. Frontend — 6 files → `C:\LAD\smartaggregator-ui\app\`

Copy over the existing files (same relative paths):

| From (this bundle) | To |
|---|---|
| `smartaggregator-ui/app/rest/api.js`                    | `…\app\rest\api.js` |
| `smartaggregator-ui/app/controllers/rpa-dashboard.js`   | `…\app\controllers\rpa-dashboard.js` |
| `smartaggregator-ui/app/views/pages/rpa-dashboard.pug`  | `…\app\views\pages\rpa-dashboard.pug` |
| `smartaggregator-ui/app/views/partials/rpad-chart5.pug` | `…\app\views\partials\rpad-chart5.pug` |
| `smartaggregator-ui/app/locales/en.json`               | `…\app\locales\en.json` |
| `smartaggregator-ui/app/locales/tr.json`               | `…\app\locales\tr.json` |

No `npm install` needed. Restart the frontend afterwards (`pm2 restart app` / restart the node process).

## 2. Backend jar — patch one class → `C:\LAD\smartaggregator\`

**Stop the backend first.**

```cmd
cd C:\LAD\smartaggregator
copy smartaggregator.jar smartaggregator.jar.bak
jar uf smartaggregator.jar -C "<bundle>\smartaggregator" BOOT-INF\classes\com\linktera\rpadashboard\component\impl\AsyncImpl.class
```

No JDK on the box → replace the whole jar with the pre-patched `smartaggregator.jar`
from this bundle (back up the old one first).

## 3. Database

You need the wider columns (`SOURCE_TYPE`, `HOST_MACHINE_NAME`, `ROBOTS`, …).
Pick **A** (keep data) or **B** (wipe — fine while testing).

### Option A — keep existing data (run the ALTERs)

Backend stopped:

```cmd
cd C:\LAD\smartaggregator
java -cp lib\h2-1.4.200.jar org.h2.tools.RunScript -url "jdbc:h2:file:./smartaggregator-db" -user sa -script "<bundle>\schema-upgrade.sql"
```

Adjust `-url` if the DB file isn't `smartaggregator-db.mv.db` in this folder
(search: `dir /s /b C:\LAD\*.mv.db`).

### Option B — wipe the DB and let it regenerate

The fresh schema is created by the app; the wider columns and the seed data
come from `config\data.sql`, so **you must also deploy the updated files below**
and start the backend with the fixed launcher.

1. Deploy into `C:\LAD\smartaggregator\`:
   - `config\data.sql`      (contains the column `ALTER`s + seed)
   - `start_backend.cmd`    (fixed: correct working dir, absolute DB/seed paths,
                             loads the H2 driver from `lib\`, `initialization-mode=always`)
2. Stop the backend.
3. Delete the DB files (find them first): `del C:\LAD\smartaggregator\smartaggregator-db.mv.db C:\LAD\smartaggregator\smartaggregator-db.trace.db`
   — check `dir /s /b C:\LAD\*.mv.db` in case they live elsewhere.
4. Start with the new launcher: `C:\LAD\smartaggregator\start_backend.cmd`
5. On a fresh DB the login is the seed account: **`admin` / `123456`** (also `okardes` / `123456`).
   Recreate any real users/roles in the UI.

> If you are NOT using `start_backend.cmd`, make sure your launcher:
> keeps `spring.datasource.initialization-mode=always`, runs with the working
> directory where `smartaggregator-db` and `config\data.sql` resolve, and puts
> `lib\h2-1.4.200.jar` on the classpath (`-Dloader.path=lib` with
> `org.springframework.boot.loader.PropertiesLauncher`, not plain `-jar`).

## 4. Restart & verify
- Backend: start it. Frontend: restart it.
- Upload the Jobs Excel — progress bar runs, completes.
- Working-hour / hourly robot runtime charts show bars.
- Hourly x-axis labels are readable (every 2nd hour on desktop).

> Uploads **append** — they do not replace. Re-importing the same period without
> clearing `RPAD_JOBS` / `RPAD_DAILY_INTENSITY` first will double the rows.
