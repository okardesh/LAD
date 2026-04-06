const XLSX = require('xlsx');
const path = require('path');
const markdown = require("markdown").markdown;
const API = require('../rest/api');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const camelcaseKeys = require("camelcase-keys");
const {saveUploadPreviewJobs, loadUploadPreviewJobs} = require('../utils/uploadPreviewStore');

function validator(file) {
    if (!file) return "No File Selected";

    file.filename = uuidv4() + path.extname(file.originalname);

    if (!`${process.env.ACCEPTABLE_FILE_TYPE}`.split(',').includes(path.extname(file.filename).split('.').pop())) return "Invalid file type";

    if (file.size > `${process.env.ACCEPTABLE_FILE_SIZE}` * 1024 * 1024) return "File size is too large";

    return false;
}

function toCamelCase(str) {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

const endpoints = [
    {
        model: 'Jobs',
        table: 'RPAD_JOBS'
    },
    {
        model: 'Queues',
        table: 'RPAD_QUEUE'
    },
];

// Known DTO fields for each table — backend rejects any extra keys (FAIL_ON_UNKNOWN_PROPERTIES=true)
const dtoFields = {
    RPAD_JOBS: new Set([
        'id', 'dataDate', 'subsidiaryId', 'releaseName', 'startTime', 'endTime',
        'totalJobTime', 'state', 'jobPriority', 'sourceType', 'hostMachineName',
        'count', 'fullTime', 'freeTime', 'successfulCount', 'faultedCount',
        'stoppedCount', 'lastDataDate', 'lastDate', 'lastJobsDate', 'lastDataTime',
        'lastStartTime', 'lastEndTime'
    ]),
    RPAD_QUEUE: new Set([
        'id', 'dataDate', 'subsidiaryId', 'queueName', 'robotName', 'robotUsername',
        'robotMachineName', 'queueStatus', 'startProcessing', 'endProcessing',
        'transactionExecutionTime', 'processingExceptionType', 'creationTime',
        'priority', 'retryNumber', 'processingExceptionReason', 'folder', 'queueId',
        'newCount', 'inProgressCount', 'failedCount', 'successfulCount',
        'abandonedCount', 'retriedCount', 'averageTime', 'lastDate', 'lastQueueDate'
    ])
};

const dtoAliases = {
    RPAD_JOBS: {
        processName: 'releaseName',
        process: 'releaseName',
        surec: 'releaseName',
        surecAdi: 'releaseName',
        robot: 'hostMachineName',
        host: 'hostMachineName',
        hostName: 'hostMachineName',
        machine: 'hostMachineName',
        machineName: 'hostMachineName',
        sunucuMakineIsmi: 'hostMachineName',
        sonVeriTarihi: 'lastDataDate'
    },
    RPAD_QUEUE: {
        queue: 'queueName',
        kuyruk: 'queueName',
        kuyrukAdi: 'queueName',
        robot: 'robotName',
        robotAdi: 'robotName',
        robotUser: 'robotUsername',
        robotKullaniciAdi: 'robotUsername',
        robotMachine: 'robotMachineName',
        robotMakine: 'robotMachineName',
        status: 'queueStatus',
        durum: 'queueStatus'
    }
};

function normalizeKey(str = '') {
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I')
        .replace(/ş/g, 's')
        .replace(/Ş/g, 'S')
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'U')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'O')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'C')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();
}

function mapHeaderToDto(header, table) {
    const allowed = dtoFields[table];
    if (!allowed) return null;

    const normalized = normalizeKey(header);
    if (!normalized) return null;

    for (const field of allowed) {
        if (normalizeKey(field) === normalized) return field;
    }

    const aliases = dtoAliases[table] || {};
    for (const [alias, field] of Object.entries(aliases)) {
        if (normalizeKey(alias) === normalized && allowed.has(field)) return field;
    }

    return null;
}

function splitSingleCellRow(row) {
    if (!Array.isArray(row) || row.length !== 1) return row;
    const cell = `${row[0] || ''}`;
    if (!cell) return row;

    // Some CSV files are parsed as a single cell per line. Split manually.
    if (cell.includes(';')) return cell.split(';').map(v => `${v}`.trim());
    if (cell.includes(',')) return cell.split(',').map(v => `${v}`.trim());

    return row;
}

// The !ref metadata in some xlsx files is truncated/incorrect.
// Recalculate it from the actual cell keys so sheet_to_json sees all rows.
function fixSheetRef(sheet) {
    let maxR = 0, maxC = 0, minR = Infinity, minC = Infinity, hasData = false;
    Object.keys(sheet).forEach(key => {
        if (key.startsWith('!')) return;
        try {
            const addr = XLSX.utils.decode_cell(key);
            if (addr.r > maxR) maxR = addr.r;
            if (addr.c > maxC) maxC = addr.c;
            if (addr.r < minR) minR = addr.r;
            if (addr.c < minC) minC = addr.c;
            hasData = true;
        } catch (e) { /* ignore non-cell keys */ }
    });
    if (hasData) {
        const newRef = XLSX.utils.encode_range({
            s: { r: minR, c: minC },
            e: { r: maxR, c: maxC }
        });
        if (newRef !== sheet['!ref']) {
            console.info('[fixSheetRef] correcting !ref from', sheet['!ref'], 'to', newRef);
            sheet['!ref'] = newRef;
        }
    }
    return sheet;
}

function scoreHeaderRow(row, table) {
    const normalizedRow = splitSingleCellRow(row);
    const mappedHeaders = normalizedRow.map(h => mapHeaderToDto(h, table));
    const mappedCount = mappedHeaders.filter(Boolean).length;
    return {
        normalizedRow,
        mappedHeaders,
        mappedCount
    };
}

function extractRowsFromSheetRange(sheet, mappedHeaders, headerIndex) {
    const ref = sheet && sheet['!ref'];
    if (!ref) return [];

    const range = XLSX.utils.decode_range(ref);
    console.info('[extractRows] ref=', ref, 'range.e.r=', range.e.r, 'headerIndex=', headerIndex);

    const mappedIndexes = mappedHeaders
        .map((field, idx) => ({field, idx}))
        .filter(item => !!item.field);

    if (!mappedIndexes.length || range.e.r <= headerIndex) {
        console.info('[extractRows] bail: mappedIndexes.length=', mappedIndexes.length, 'range.e.r=', range.e.r, 'headerIndex=', headerIndex);
        return [];
    }

    const rows = [];
    for (let rowIndex = headerIndex + 1; rowIndex <= range.e.r; rowIndex += 1) {
        const obj = {};
        mappedIndexes.forEach(({field, idx}) => {
            const cell = sheet[XLSX.utils.encode_cell({r: rowIndex, c: idx})];
            const value = cell ? (cell.w ?? cell.v ?? '') : '';
            if (`${value}`.trim() === '') return;
            obj[field] = value;
        });

        if (Object.keys(obj).length > 0) rows.push(obj);
    }
    console.info('[extractRows] rows found=', rows.length, 'sample=', JSON.stringify(rows[0] || null));
    return rows;
}

function parseSheetForTable(sheet, table) {
    fixSheetRef(sheet);
    const ref = sheet && sheet['!ref'];
    const rawRange = ref ? XLSX.utils.decode_range(ref) : null;
    console.info('[parseSheet] !ref=', ref, 'range=', rawRange);

    const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: ''
    });

    console.info('[parseSheet] matrixLength=', matrix.length,
        'row0=', JSON.stringify(matrix[0] || []).slice(0, 200),
        'row1=', JSON.stringify(matrix[1] || []).slice(0, 200),
        'row2=', JSON.stringify(matrix[2] || []).slice(0, 200));

    if (!Array.isArray(matrix) || matrix.length === 0) {
        return {rows: [], mappedColumns: [], unknownColumns: []};
    }

    // Auto-detect header line in first 25 rows (handles title rows above actual header)
    const maxScan = Math.min(matrix.length, 25);
    let headerIndex = 0;
    let best = scoreHeaderRow(matrix[0] || [], table);

    for (let i = 1; i < maxScan; i++) {
        const candidate = scoreHeaderRow(matrix[i] || [], table);
        if (candidate.mappedCount > best.mappedCount) {
            best = candidate;
            headerIndex = i;
        }
    }

    const headerRow = best.normalizedRow || [];
    const mappedHeaders = best.mappedHeaders || [];
    const mappedColumns = headerRow.filter((_, idx) => !!mappedHeaders[idx]);
    const unknownColumns = headerRow.filter((h, idx) => !!h && !mappedHeaders[idx]);

    let rows = matrix.slice(headerIndex + 1)
        .map(cells => {
            const normalizedCells = splitSingleCellRow(cells);
            const obj = {};
            mappedHeaders.forEach((field, idx) => {
                if (!field) return;
                const value = normalizedCells[idx];
                if (value === null || value === undefined || `${value}`.trim() === '') return;
                obj[field] = value;
            });
            return obj;
        })
        .filter(obj => Object.keys(obj).length > 0);

    if (!rows.length && mappedColumns.length) {
        const customHeaders = headerRow.map((_, idx) => mappedHeaders[idx] || `__ignore_${idx}`);
        const fallbackRows = XLSX.utils.sheet_to_json(sheet, {
            header: customHeaders,
            range: headerIndex + 1,
            raw: false,
            defval: '',
            blankrows: false
        });

        rows = fallbackRows
            .map(row => Object.fromEntries(
                Object.entries(row).filter(([key, value]) => !key.startsWith('__ignore_') && `${value}`.trim() !== '')
            ))
            .filter(row => Object.keys(row).length > 0);
    }

    if (!rows.length && mappedColumns.length) {
        const objectRows = XLSX.utils.sheet_to_json(sheet, {
            raw: false,
            defval: '',
            blankrows: false,
            range: headerIndex
        });

        rows = objectRows
            .map(row => {
                const obj = {};
                Object.entries(row).forEach(([key, value]) => {
                    const field = mapHeaderToDto(key, table);
                    if (!field || `${value}`.trim() === '') return;
                    obj[field] = value;
                });
                return obj;
            })
            .filter(row => Object.keys(row).length > 0);
    }

    if (!rows.length && mappedColumns.length) {
        rows = extractRowsFromSheetRange(sheet, mappedHeaders, headerIndex);
    }

    return {rows, mappedColumns, unknownColumns};
}

function parseWorkbookForTable(workbook, table) {
    const sheetNames = Array.isArray(workbook.SheetNames) ? workbook.SheetNames : [];
    console.info('[parseWorkbook] sheetNames=', sheetNames);
    sheetNames.forEach(n => {
        const s = workbook.Sheets[n];
        const ref = s && s['!ref'];
        const keys = s ? Object.keys(s).filter(k => !k.startsWith('!')).slice(0, 10) : [];
        console.info('[parseWorkbook] sheet=', n, 'ref=', ref, 'sampleKeys=', keys);
    });

    let best = {
        sheetName: sheetNames[0] || null,
        rows: [],
        mappedColumns: [],
        unknownColumns: []
    };

    sheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;

        const parsed = parseSheetForTable(sheet, table);
        const bestScore = (best.rows.length * 100) + best.mappedColumns.length;
        const currentScore = (parsed.rows.length * 100) + parsed.mappedColumns.length;

        if (currentScore > bestScore) {
            best = {
                sheetName,
                rows: parsed.rows,
                mappedColumns: parsed.mappedColumns,
                unknownColumns: parsed.unknownColumns
            };
        }
    });

    return best;
}

function filterToDto(rows, table) {
    const allowed = dtoFields[table];
    if (!allowed) return rows;
    return rows.map(row =>
        Object.fromEntries(Object.entries(row).filter(([k]) => allowed.has(k)))
    );
}

exports.getFinancialManagement = async (req, res) => {
    let hosts = [];
    let jobs = [];
    try {
        const report = await API.requestAsync(`${process.env.API_DASHBOARD_TABLE}/rpad`, 'GET', {}, req, res);
        if (report && report.statusCode === 200 && report.rpad) {
            if (Array.isArray(report.rpad.hosts)) hosts = report.rpad.hosts;
            if (Array.isArray(report.rpad.jobs)) jobs = report.rpad.jobs;
        }
    } catch (err) {
        console.error('[financialManagement] getFinancialManagement hosts error:', err);
    }

    // Fallback: show the latest successfully uploaded rows on this page
    // even if dashboard aggregate endpoint does not return jobs for current user/subsidiary.
    if (!jobs || !jobs.length) {
        if (req.session && Array.isArray(req.session.uploadPreviewJobs) && req.session.uploadPreviewJobs.length) {
            jobs = req.session.uploadPreviewJobs;
            if (req.user && req.user.uuid) {
                await saveUploadPreviewJobs(req.user.uuid, req.session.uploadPreviewJobs);
            }
        } else if (req.user && req.user.uuid) {
            const persistedJobs = await loadUploadPreviewJobs(req.user.uuid);
            if (persistedJobs.length) {
                jobs = persistedJobs;
                if (req.session) req.session.uploadPreviewJobs = persistedJobs;
            }
        }
    }

    const render = {
        title: 'Data Upload',
        page: "financialManagement",
        info: markdown.toHTML(req.__('info.financialManagement')),
        models: endpoints.map(x => x.model),
        hosts,
        jobs
    };

    res.render('pages/'.concat(render.page), render);
};

exports.postFinancialManagement = async (req, res) => {
    try {
        const action = endpoints.find(e => toCamelCase(e.model) === req.body.model);
        const file = req.file;
        const invalid = validator(file);

        if (invalid) {
            req.flash('errors', {msg: invalid});
            return res.redirect(req.path);
        }

        if (!action) {
            req.flash('errors', {msg: 'Group selection not detected or invalid. Please try again.'});
            return res.redirect(req.path);
        }

        const wb = XLSX.read(file.buffer, {type: 'buffer', dateNF: 'dd/mm/yyyy'});
        const parsed = parseWorkbookForTable(wb, action.table);

        console.info('[financialManagement] upload parse', {
            sheetName: parsed.sheetName,
            table: action.table,
            mappedColumns: parsed.mappedColumns,
            unknownColumns: parsed.unknownColumns,
            rowCount: parsed.rows.length,
            sampleRow: parsed.rows[0] || null
        });

        if (!parsed.mappedColumns.length) {
            req.flash('errors', {
                msg: 'Dosya başlıkları şablon ile eşleşmiyor. Lütfen doğru kolon isimleriyle tekrar yükleyin.'
            });
            return res.redirect(req.path);
        }

        if (!parsed.rows.length) {
            req.flash('errors', {
                msg: `Dosyada işlenecek satır bulunamadı. Eşleşen kolonlar: ${parsed.mappedColumns.join(', ')}`
            });
            return res.redirect(req.path);
        }

        const request = {
            uri: `${process.env.API_SYSTEM}/upload`,
            method: 'POST',
            data: {
                batchId: path.parse(file.filename).name,
                table: action.table,
                list: filterToDto(parsed.rows, action.table)
            }
        };

        const data = await API.requestAsync(request.uri, request.method, request.data, req, res);

        if (data && data.statusCode === 406 && data.error) {
            const arr = data.error.split(' - ');
            req.flash('errors', {
                msg: arr[0] + ': #',
                params: [arr[1]]
            });
            return res.redirect(req.path);
        }

        if (data && data.statusCode === 400) {
            req.flash('errors', {msg: 'Dosya formatı geçersiz. Lütfen doğru şablon ile tekrar deneyin.'});
            return res.redirect(req.path);
        }

        if (data && data.statusCode === 200) {
            if (action.table === 'RPAD_JOBS' && req.session) {
                req.session.uploadPreviewJobs = parsed.rows;
            }
            if (action.table === 'RPAD_JOBS' && req.user && req.user.uuid) {
                await saveUploadPreviewJobs(req.user.uuid, parsed.rows);
            }
            req.flash('info', {
                msg: req.__('# row(s) have been processed.'),
                params: [parsed.rows.length]
            });
            return res.redirect(req.path);
        }

        req.flash('errors', {msg: (data && data.error) || 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    } catch (error) {
        console.error('[financialManagement] postFinancialManagement error:', error);
        req.flash('errors', {msg: 'Upload failed. Please verify the file template and try again.'});
        return res.redirect(req.path);
    }
};
