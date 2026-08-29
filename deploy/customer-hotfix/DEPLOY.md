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

## 1. Frontend files  → `C:\LAD\smartaggregator-ui\app\`

Copy these 6 files over the existing ones (same relative paths):

| From (this bundle) | To |
|---|---|
| `smartaggregator-ui/app/rest/api.js`                     | `C:\LAD\smartaggregator-ui\app\rest\api.js` |
| `smartaggregator-ui/app/controllers/rpa-dashboard.js`    | `C:\LAD\smartaggregator-ui\app\controllers\rpa-dashboard.js` |
| `smartaggregator-ui/app/views/pages/rpa-dashboard.pug`   | `C:\LAD\smartaggregator-ui\app\views\pages\rpa-dashboard.pug` |
| `smartaggregator-ui/app/views/partials/rpad-chart5.pug`  | `C:\LAD\smartaggregator-ui\app\views\partials\rpad-chart5.pug` |
| `smartaggregator-ui/app/locales/en.json`                 | `C:\LAD\smartaggregator-ui\app\locales\en.json` |
| `smartaggregator-ui/app/locales/tr.json`                 | `C:\LAD\smartaggregator-ui\app\locales\tr.json` |

No `npm install` needed (no dependency changes).

## 2. Backend — patch one class in the jar

**Stop the backend first.** Then, from `C:\LAD\smartaggregator`, inject the patched class
into the existing jar (needs a JDK on PATH for the `jar` tool):

```cmd
cd C:\LAD\smartaggregator
copy smartaggregator.jar smartaggregator.jar.bak
jar uf smartaggregator.jar -C "<bundle>\smartaggregator" BOOT-INF\classes\com\linktera\rpadashboard\component\impl\AsyncImpl.class
```

No JDK on the box? Use the fully pre-patched `smartaggregator.jar` supplied alongside
this bundle instead — back up the old one and drop the new one in place.

## 3. Database — widen columns (once)

With the backend still stopped:

```cmd
cd C:\LAD\smartaggregator
java -cp lib\h2-1.4.200.jar org.h2.tools.RunScript -url "jdbc:h2:file:./smartaggregator-db" -user sa -script "<bundle>\schema-upgrade.sql"
```

(Adjust the `-url` if the DB file/path differs from `smartaggregator-db`.)

## 4. Restart

- Backend: start it with the customer's normal script.
- Frontend: `pm2 restart app` (or restart the node process / Windows task).

## 5. Verify
- Open the RPA dashboard, upload the Jobs Excel — progress bar runs, completes.
- The working-hour / hourly robot runtime charts show bars.
- Hourly x-axis labels are readable (every 2nd hour on desktop).

> Uploads **append** — they do not replace. If re-importing the same period,
> clear `RPAD_JOBS` / `RPAD_DAILY_INTENSITY` first or rows will double up.
