const fs = require('fs');
const path = require('path');
const XLSX = require('/Users/onurkardes/Antigravity/LAD/smartaggregator-ui/app/node_modules/xlsx');
const dir = '/Users/onurkardes/Antigravity/LAD/smartaggregator-ui/uploads';
const wanted = ['DATA_DATE','RELEASE_NAME','START_TIME','END_TIME','TOTAL_JOB_TIME','STATE','JOB_PRIORITY','SOURCE_TYPE','HOST_MACHINE_NAME'];

function toText(value) {
  return String(value == null ? '' : value).trim();
}

for (const file of fs.readdirSync(dir).filter(name => /\.(xlsx|xls)$/i.test(name))) {
  const fullPath = path.join(dir, file);
  try {
    const workbook = XLSX.readFile(fullPath, { cellDates: false });
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      for (let index = 0; index < Math.min(rows.length, 25); index += 1) {
        const row = (rows[index] || []).map(toText);
        const matches = wanted.filter(header => row.includes(header)).length;
        if (matches >= 5) {
          const nonEmptyAfter = rows.slice(index + 1).filter(r => (r || []).some(cell => toText(cell) !== '')).length;
          console.log(JSON.stringify({
            file,
            sheetName,
            headerRow: index + 1,
            matches,
            nonEmptyAfter,
            firstDataRow: rows[index + 1] || []
          }));
        }
      }
    }
  } catch (error) {
  }
}
