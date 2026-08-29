const API = require('../rest/api');
const XLSX = require('xlsx');
const path = require('path');
const markdown = require("markdown").markdown;
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const camelcaseKeys = require("camelcase-keys");
const {loadUploadPreviewJobs, saveUploadPreviewJobs} = require('../utils/uploadPreviewStore');

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

function getJobDate(row) {
        const value = row && (row.startTime || row.workDate || row.dataDate);
        const text = `${value || ''}`.trim();
        const match = text.match(/(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})/);
        if (!match) return value || null;

        const first = Number(match[1]);
        const second = Number(match[2]);
        const third = Number(match[3]);
        const year = first > 31 ? first : third;
        const month = first > 31 ? second : (second > 12 ? third : second);
        const day = first > 31 ? third : (second > 12 ? second : first);
        if (![year, month, day].every(Number.isFinite) || year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
                return value || null;
        }

        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function formatUploadDate(value, includeTime) {
    if (value === null || value === undefined || `${value}`.trim() === '') return value;
    const text = `${value}`.trim();
    let date = null;
    const european = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (european) {
        date = new Date(Number(european[3]), Number(european[2]) - 1, Number(european[1]), Number(european[4] || 0), Number(european[5] || 0), Number(european[6] || 0));
    } else if (iso) {
        date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4] || 0), Number(iso[5] || 0), Number(iso[6] || 0));
    } else {
        const parsed = new Date(text);
        if (!Number.isNaN(parsed.getTime())) date = parsed;
    }
    if (!date || Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    if (!includeTime) return `${year}-${month}-${day}`;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatUploadDateOnly(value) {
    const normalized = formatUploadDate(value, false);
    if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(`${normalized}`)) return normalized;
    const [year, month, day] = normalized.split('-');
    return `${day}/${month}/${year}`;
}

// Fields the backend RpadJobsDto accepts. Anything else (e.g. "localSystemAccount",
// "robotName") makes the backend upload fail with an "Unrecognized field" 500,
// so we drop unknown columns before sending.
const RPAD_JOBS_ALLOWED_KEYS = new Set([
    'jobPriority', 'stoppedCount', 'totalJobTime', 'endTime', 'lastDataTime',
    'faultedCount', 'startTime', 'state', 'lastEndTime', 'lastUpdater',
    'createdTime', 'freeTime', 'lastJobsDate', 'lastDate', 'subsidiaryId',
    'hostMachineName', 'creator', 'lastDataDate', 'lastUpdatedTime', 'sourceType',
    'dataDate', 'luc', 'uuid', 'fullTime', 'count', 'successfulCount',
    'lastStartTime', 'status', 'histories', 'releaseName'
]);

const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

function normalizeJobsUploadRows(rows) {
    const normalized = rows.map(row => {
        const out = {};
        Object.keys(row).forEach(key => {
            if (RPAD_JOBS_ALLOWED_KEYS.has(key)) out[key] = row[key];
        });
        out.startTime = formatUploadDate(out.startTime, true);
        out.endTime = formatUploadDate(out.endTime, true);
        // Backend expects dd/MM/yyyy here. Fall back to the job's start date
        // when the column is missing/blank.
        const rawDataDate = `${out.dataDate || ''}`.trim();
        out.dataDate = formatUploadDateOnly(rawDataDate || out.startTime);
        return out;
    });

    // The backend's autoDailyIntensity step walks each day from startTime to
    // endTime and formats dataDate, calling Date methods with no null guard.
    // Rows missing any of the three (e.g. Pending/Running jobs in a UiPath
    // export) throw "date must not be null" and abort the whole upload, so we
    // drop them here.
    const usable = normalized.filter(r =>
        DATETIME_RE.test(`${r.startTime || ''}`) &&
        DATETIME_RE.test(`${r.endTime || ''}`) &&
        DATE_RE.test(`${r.dataDate || ''}`)
    );

    const dropped = normalized.length - usable.length;
    if (dropped > 0) {
        console.log(`[upload] dropped ${dropped} RPAD_JOBS row(s) with missing/invalid start, end or data date`);
    }
    return usable;
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
  {
      model: 'Daily Intensity',
      table: 'RPAD_DAILY_INTENSITY'
  },
];

function generateArrayOfYears() {
    var max = new Date().getFullYear()
    var min = max - 11
    var years = []

    for (var i = max; i >= min; i--) {
      years.push(i)
    }
    return years
  }

exports.getRpaDashboard = async (req, res) => {
    try {
        const asArray = (v) => Array.isArray(v) ? v : [];
        const hasItems = (v) => Array.isArray(v) && v.length > 0;
        const useLocalFallback = process.env.USE_LOCAL_FALLBACK === 'true';
        const uniqueBy = (arr, keyFn) => {
            const map = new Map();
            (arr || []).forEach(item => {
                const key = keyFn(item);
                if (key !== null && key !== undefined && `${key}`.trim() !== '' && !map.has(key)) {
                    map.set(key, item);
                }
            });
            return Array.from(map.values());
        };

        var response = {};
        var dataDateResponse = { hosts: [], robotNames: [] };
        var months = [{key:1, name:'January'},{key:2, name:'February'},{key:3, name:'March'},{key:4, name:'April'},{key:5, name:'May'},{key:6, name:'June'},
                    {key:7, name:'July'},{key:8, name:'August'},{key:9, name:'September'},{key:10, name:'October'},{key:11, name:'November'},{key:12, name:'December'}];

        let report = await API.requestAsync(`${process.env.API_DASHBOARD_TABLE}/rpad`, 'GET', {}, req, res);

        let dataDate = await API.requestAsync(`${process.env.API_RPAD_ROBOT_LIST}`, 'GET', {}, req, res);
        if (dataDate && dataDate.statusCode === 200 && dataDate.rpad) {
            dataDateResponse = dataDate.rpad;
        }

        if (report && report.statusCode === 200 && report.rpad) {
            response = report.rpad;
        }

        // Fallback for local/dev where dashboard aggregate endpoints may return empty,
        // but user has just uploaded valid RPAD_JOBS rows.
        let previewJobs = useLocalFallback && req.session && Array.isArray(req.session.uploadPreviewJobs)
            ? req.session.uploadPreviewJobs
            : [];

        if (useLocalFallback && (!previewJobs || !previewJobs.length) && req.user && req.user.uuid) {
            previewJobs = await loadUploadPreviewJobs(req.user.uuid);
            if (req.session && previewJobs.length) req.session.uploadPreviewJobs = previewJobs;
        }

        if (useLocalFallback && previewJobs && previewJobs.length && req.user && req.user.uuid) {
            // Backfill persistent cache from session on read path.
            await saveUploadPreviewJobs(req.user.uuid, previewJobs);
        }

        if (useLocalFallback && previewJobs.length) {
            const normalizedPreviewJobs = previewJobs.map(j => ({
                ...j,
                count: j && j.count != null && `${j.count}` !== '' ? j.count : 1
            }));

            if (!hasItems(response.jobsData)) {
                response.jobsData = normalizedPreviewJobs;
            }

            const robots = uniqueBy(normalizedPreviewJobs, j => j && j.hostMachineName)
                .map(j => ({hostMachineName: j.hostMachineName}));

            if (!hasItems(response.rpadStateChart2)) {
                response.rpadStateChart2 = robots;
            }

            if (!hasItems(response.robotsOccupancyRateChart2)) {
                response.robotsOccupancyRateChart2 = robots;
            }

            if (!hasItems(response.releaseTotalTimeChart)) {
                const releaseMap = new Map();
                normalizedPreviewJobs.forEach(j => {
                    const key = j && j.releaseName ? j.releaseName : 'N/A';
                    if (!releaseMap.has(key)) releaseMap.set(key, {releaseName: key, totalJobTime: 0});
                    const item = releaseMap.get(key);
                    const num = parseFloat(`${j && j.totalJobTime != null ? j.totalJobTime : 0}`.replace(',', '.'));
                    item.totalJobTime += Number.isFinite(num) ? num : 0;
                });
                response.releaseTotalTimeChart = Array.from(releaseMap.values());
            }

            if (!hasItems(response.rpadStateChart)) {
                const stateMap = new Map();
                normalizedPreviewJobs.forEach(j => {
                    const key = j && j.state ? j.state : 'N/A';
                    if (!stateMap.has(key)) stateMap.set(key, {state: key, count: 0});
                    const item = stateMap.get(key);
                    const cnt = parseInt(j && j.count != null ? j.count : 1, 10);
                    item.count += Number.isFinite(cnt) ? cnt : 1;
                });
                response.rpadStateChart = Array.from(stateMap.values());
            }

            if (!hasItems(dataDateResponse.hosts)) {
                const latestDate = normalizedPreviewJobs
                    .map(getJobDate)
                    .filter(Boolean)
                    .slice(-1)[0] || null;
                dataDateResponse.hosts = robots.map(r => ({
                    hostMachineName: r.hostMachineName,
                    lastDate: latestDate,
                    lastJobsDate: latestDate
                }));
            }

            if (!hasItems(dataDateResponse.robotNames)) {
                const latestDate = normalizedPreviewJobs
                    .map(getJobDate)
                    .filter(Boolean)
                    .slice(-1)[0] || null;
                dataDateResponse.robotNames = robots.map(r => ({
                    robotName: r.hostMachineName,
                    lastQueueDate: latestDate
                }));
            }

            const chartSourceJobs = normalizedPreviewJobs;
            const toNumber = (value) => {
                const parsed = parseFloat(`${value != null ? value : 0}`.replace(',', '.'));
                return Number.isFinite(parsed) ? parsed : 0;
            };
            const resolveMinutes = (row) => {
                const full = toNumber(row && row.fullTime);
                if (full > 0) return full;
                const total = toNumber(row && row.totalJobTime);
                if (total > 0) return total / 60;
                const tx = toNumber(row && row.transactionExecutionTime);
                if (tx > 0) return tx;
                const avg = toNumber(row && row.averageTime);
                const cnt = parseInt(row && row.count != null ? row.count : 1, 10);
                if (avg > 0) return avg * (Number.isFinite(cnt) && cnt > 0 ? cnt : 1);
                if (Number.isFinite(cnt) && cnt > 0) return cnt;
                return 0;
            };
            const hasPositiveValue = (rows, fields) => {
                return (rows || []).some(row => fields.some(field => toNumber(row && row[field]) > 0));
            };
            const latestValue = (rows, keys) => {
                for (let i = rows.length - 1; i >= 0; i--) {
                    const row = rows[i] || {};
                    for (const key of keys) {
                        if (row[key]) return row[key];
                    }
                }
                return null;
            };
            const aggregateHours = (rows, groupKey, valueKey = groupKey) => {
                const map = new Map();
                rows.forEach(row => {
                    const fallbackDate = groupKey === 'workDate'
                        ? getJobDate(row)
                        : row && (row.workDate || row.dataDate || row.createDate || row.updateDate);
                    const key = row && row[groupKey] ? row[groupKey] : (groupKey === 'workDate' ? (fallbackDate || 'N/A') : 'N/A');
                    if (!map.has(key)) {
                        const entry = { [valueKey]: key };
                        for (let i = 0; i < 24; i++) entry[`h${i}`] = 0;
                        map.set(key, entry);
                    }
                    const entry = map.get(key);
                    let hasNativeHourly = false;
                    for (let i = 0; i < 24; i++) {
                        const hourlyValue = toNumber(row && row[`h${i}`]);
                        if (hourlyValue > 0) hasNativeHourly = true;
                        entry[`h${i}`] += hourlyValue;
                    }

                    if (!hasNativeHourly) {
                        // Spread inferred runtime to business-hour slots for a visible non-zero profile.
                        const inferredMinutes = resolveMinutes(row);
                        if (inferredMinutes > 0) {
                            const perHour = inferredMinutes / 9;
                            for (let i = 8; i <= 16; i++) {
                                entry[`h${i}`] += perHour;
                            }
                        }
                    }
                });
                return Array.from(map.values());
            };
            const aggregateByKey = (rows, groupKey, fields) => {
                const map = new Map();
                rows.forEach(row => {
                    const key = row && row[groupKey] ? row[groupKey] : 'N/A';
                    if (!map.has(key)) {
                        const entry = { [groupKey]: key };
                        fields.forEach(field => {
                            entry[field] = 0;
                        });
                        map.set(key, entry);
                    }
                    const entry = map.get(key);
                    fields.forEach(field => {
                        entry[field] += toNumber(row && row[field]);
                    });
                });
                return Array.from(map.values());
            };
            const classifyState = (stateValue) => {
                const text = `${stateValue || ''}`.toLowerCase();
                if (!text) return 'stopped';
                if (text.includes('success') || text.includes('başar')) return 'successful';
                if (text.includes('fault') || text.includes('error') || text.includes('fail') || text.includes('hata')) return 'faulted';
                return 'stopped';
            };
            const resolveQueueName = (row) => {
                const queue = row && typeof row.queueName === 'string' ? row.queueName.trim() : '';
                if (queue && queue.toUpperCase() !== 'N/A') return queue;

                const release = row && typeof row.releaseName === 'string' ? row.releaseName.trim() : '';
                if (release) return `Release: ${release}`;

                const host = row && typeof row.hostMachineName === 'string' ? row.hostMachineName.trim() : '';
                if (host) return `Robot: ${host}`;

                return null;
            };

            // Chart1 expects per-robot successful/faulted/stopped counters.
            if (!hasItems(response.rpadStateChart2) || response.rpadStateChart2.every(r => r && r.successfulCount == null && r.faultedCount == null && r.stoppedCount == null)) {
                const stateByRobot = new Map();
                chartSourceJobs.forEach(row => {
                    const host = row && row.hostMachineName ? row.hostMachineName : null;
                    if (!host) return;
                    if (!stateByRobot.has(host)) {
                        stateByRobot.set(host, {
                            hostMachineName: host,
                            successfulCount: 0,
                            faultedCount: 0,
                            stoppedCount: 0
                        });
                    }
                    const item = stateByRobot.get(host);
                    const count = parseInt(row && row.count != null ? row.count : 1, 10);
                    const add = Number.isFinite(count) ? count : 1;
                    const kind = classifyState(row && row.state);
                    if (kind === 'successful') item.successfulCount += add;
                    else if (kind === 'faulted') item.faultedCount += add;
                    else item.stoppedCount += add;
                });
                response.rpadStateChart2 = Array.from(stateByRobot.values());
            }

            // Chart2 expects per-robot fullTime/freeTime values.
            if (!hasItems(response.robotsOccupancyRateChart2)
                || response.robotsOccupancyRateChart2.every(r => r && r.fullTime == null && r.freeTime == null)
                || !hasPositiveValue(response.robotsOccupancyRateChart2, ['fullTime', 'freeTime'])) {
                const occupancyByRobot = new Map();
                chartSourceJobs.forEach(row => {
                    const host = row && row.hostMachineName ? row.hostMachineName : null;
                    if (!host) return;
                    if (!occupancyByRobot.has(host)) {
                        occupancyByRobot.set(host, {
                            hostMachineName: host,
                            fullTime: 0,
                            freeTime: 0
                        });
                    }
                    const item = occupancyByRobot.get(host);
                    const inferred = resolveMinutes(row);
                    item.fullTime += toNumber(row && row.fullTime) || inferred;
                    item.freeTime += toNumber(row && row.freeTime);
                });
                response.robotsOccupancyRateChart2 = Array.from(occupancyByRobot.values());
            }

            if (!hasItems(response.workingHoursOccupancyChart)
                || !hasPositiveValue(response.workingHoursOccupancyChart, ['workedHours', 'freeHours'])) {
                const inferredWorkedMinutes = chartSourceJobs.reduce((sum, row) => sum + resolveMinutes(row), 0);
                const robotCount = new Set(chartSourceJobs
                    .map(row => row && row.hostMachineName)
                    .filter(Boolean)).size;
                const availableMinutes = Math.max(0, robotCount * 9 * 60);
                const workedMinutes = availableMinutes > 0
                    ? Math.min(inferredWorkedMinutes, availableMinutes)
                    : inferredWorkedMinutes;
                response.workingHoursOccupancyChart = [{
                    workDate: getJobDate(chartSourceJobs[chartSourceJobs.length - 1]),
                    workedHours: workedMinutes,
                    freeHours: Math.max(0, availableMinutes - workedMinutes)
                }];
            }

            if (!hasItems(response.totalJobTimeChart)) {
                response.totalJobTimeChart = aggregateByKey(chartSourceJobs, 'hostMachineName', ['totalJobTime']);
            }

            if (!hasItems(response.robotsOccupancyRateChart)
                || !hasPositiveValue(response.robotsOccupancyRateChart, ['fullTime', 'freeTime'])) {
                const robotOccMap = new Map();
                chartSourceJobs.forEach(row => {
                    const host = row && row.hostMachineName ? row.hostMachineName : 'N/A';
                    if (!robotOccMap.has(host)) {
                        robotOccMap.set(host, { hostMachineName: host, fullTime: 0, freeTime: 0 });
                    }
                    const item = robotOccMap.get(host);
                    const inferred = resolveMinutes(row);
                    item.fullTime += toNumber(row && row.fullTime) || inferred;
                    item.freeTime += toNumber(row && row.freeTime);
                });
                response.robotsOccupancyRateChart = Array.from(robotOccMap.values());
            }

            const densityHasPositive = (rows) => (rows || []).some(row => {
                for (let i = 0; i < 24; i++) {
                    if (toNumber(row && row[`h${i}`]) > 0) return true;
                }
                return false;
            });

            if (!hasItems(response.dailyDensityChart) || !densityHasPositive(response.dailyDensityChart)) {
                response.dailyDensityChart = aggregateHours(chartSourceJobs, 'workDate');
            }

            if (!hasItems(response.overallChart)) {
                response.overallChart = aggregateHours(chartSourceJobs, 'releaseName', 'releaseName');
                response.overallChart.forEach(row => {
                    row.workDate = getJobDate(chartSourceJobs[chartSourceJobs.length - 1]);
                    row.releaseName = row.releaseName || row.releaseName || 'N/A';
                });
            }

            if (!hasItems(response.queueTransactionTimeChart)) {
                const queueTransactionMap = new Map();
                chartSourceJobs.forEach(row => {
                    const queueName = resolveQueueName(row);
                    if (!queueName) return;

                    if (!queueTransactionMap.has(queueName)) {
                        queueTransactionMap.set(queueName, {
                            queueName,
                            transactionExecutionTime: 0,
                            averageTime: 0,
                            _count: 0
                        });
                    }
                    const entry = queueTransactionMap.get(queueName);
                    entry.transactionExecutionTime += toNumber(row && (row.transactionExecutionTime != null ? row.transactionExecutionTime : row.totalJobTime));
                    entry.averageTime += toNumber(row && (row.averageTime != null ? row.averageTime : row.transactionExecutionTime));
                    entry._count += 1;
                });
                response.queueTransactionTimeChart = Array.from(queueTransactionMap.values()).map(entry => ({
                    queueName: entry.queueName,
                    transactionExecutionTime: entry.transactionExecutionTime,
                    averageTime: Math.round(entry.averageTime / Math.max(1, entry._count))
                }));
            }

            if (!hasItems(response.queueStatusChart)) {
                const queueStatusMap = new Map();
                chartSourceJobs.forEach(row => {
                    const queueName = resolveQueueName(row);
                    if (!queueName) return;
                    if (!queueStatusMap.has(queueName)) {
                        queueStatusMap.set(queueName, {
                            queueName,
                            successfulCount: 0,
                            newCount: 0,
                            inProgressCount: 0,
                            failedCount: 0,
                            abandonedCount: 0,
                            retriedCount: 0
                        });
                    }
                    const item = queueStatusMap.get(queueName);
                    const count = parseInt(row && row.count != null ? row.count : 1, 10);
                    const add = Number.isFinite(count) ? count : 1;
                    const kind = classifyState(row && row.state);
                    if (kind === 'successful') item.successfulCount += add;
                    else if (kind === 'faulted') item.failedCount += add;
                    else item.inProgressCount += add;
                });
                response.queueStatusChart = Array.from(queueStatusMap.values());
                if (!response.queueStatusChart.length && chartSourceJobs.length > 0) {
                    response.queueStatusChart = [{
                        queueName: 'Generated Queue',
                        successfulCount: 0,
                        newCount: 0,
                        inProgressCount: chartSourceJobs.length,
                        failedCount: 0,
                        abandonedCount: 0,
                        retriedCount: 0
                    }];
                }
            }
        }

        // Secondary fallback: when backend payload has state counters but minute-based datasets
        // are empty/zero, derive non-zero chart values from available state counts.
        if (useLocalFallback) {
            const asArraySafe = (v) => Array.isArray(v) ? v : [];
            const toNumSafe = (v) => {
                const n = parseFloat(`${v != null ? v : 0}`.replace(',', '.'));
                return Number.isFinite(n) ? n : 0;
            };
            const hasPositive = (rows, fields) => asArraySafe(rows).some(row => fields.some(field => toNumSafe(row && row[field]) > 0));

            const stateRows = asArraySafe(response.rpadStateChart2);
            const totalStateCount = stateRows.reduce((sum, row) => {
                return sum
                    + toNumSafe(row && row.successfulCount)
                    + toNumSafe(row && row.faultedCount)
                    + toNumSafe(row && row.stoppedCount);
            }, 0);

            if (stateRows.length && (!Array.isArray(response.robotsOccupancyRateChart2) || !hasPositive(response.robotsOccupancyRateChart2, ['fullTime', 'freeTime']))) {
                response.robotsOccupancyRateChart2 = stateRows.map(row => {
                    const full = toNumSafe(row && row.successfulCount) + toNumSafe(row && row.faultedCount) + toNumSafe(row && row.stoppedCount);
                    return {
                        hostMachineName: row && row.hostMachineName ? row.hostMachineName : 'N/A',
                        fullTime: full,
                        freeTime: 0
                    };
                });
            }

            if (!Array.isArray(response.robotsOccupancyRateChart) || !hasPositive(response.robotsOccupancyRateChart, ['fullTime', 'freeTime'])) {
                response.robotsOccupancyRateChart = asArraySafe(response.robotsOccupancyRateChart2).map(row => ({
                    hostMachineName: row.hostMachineName,
                    fullTime: toNumSafe(row.fullTime),
                    freeTime: toNumSafe(row.freeTime)
                }));
            }

            if (!Array.isArray(response.workingHoursOccupancyChart) || !hasPositive(response.workingHoursOccupancyChart, ['workedHours', 'freeHours'])) {
                const workedFromRobots = asArraySafe(response.robotsOccupancyRateChart2).reduce((sum, row) => sum + toNumSafe(row && row.fullTime), 0);
                const freeFromRobots = asArraySafe(response.robotsOccupancyRateChart2).reduce((sum, row) => sum + toNumSafe(row && row.freeTime), 0);
                const latestDate = getJobDate(asArraySafe(response.jobsData).slice(-1)[0]);
                response.workingHoursOccupancyChart = [{
                    workDate: latestDate,
                    workedHours: workedFromRobots || totalStateCount,
                    freeHours: freeFromRobots
                }];
            }

            const dailyHasPositive = asArraySafe(response.dailyDensityChart).some(row => {
                for (let i = 0; i < 24; i++) {
                    if (toNumSafe(row && row[`h${i}`]) > 0) return true;
                }
                return false;
            });

            if (!Array.isArray(response.dailyDensityChart) || !response.dailyDensityChart.length || !dailyHasPositive) {
                const worked = asArraySafe(response.workingHoursOccupancyChart).reduce((sum, row) => sum + toNumSafe(row && row.workedHours), 0) || totalStateCount;
                const row = { workDate: asArraySafe(response.workingHoursOccupancyChart)[0]?.workDate || null };
                for (let i = 0; i < 24; i++) row[`h${i}`] = 0;
                const bucket = worked > 0 ? worked / 9 : 0;
                for (let i = 8; i <= 16; i++) row[`h${i}`] = bucket;
                response.dailyDensityChart = [row];
            }

            const overallHasPositive = asArraySafe(response.overallChart).some(row => {
                for (let i = 0; i < 24; i++) {
                    if (toNumSafe(row && row[`h${i}`]) > 0) return true;
                }
                return false;
            });

            if (!Array.isArray(response.overallChart) || !response.overallChart.length || !overallHasPositive) {
                const worked = asArraySafe(response.workingHoursOccupancyChart).reduce((sum, row) => sum + toNumSafe(row && row.workedHours), 0) || totalStateCount;
                const releaseName = asArraySafe(response.releaseTotalTimeChart)[0]?.releaseName || 'Generated Release';
                const row = { releaseName, workDate: asArraySafe(response.workingHoursOccupancyChart)[0]?.workDate || null };
                for (let i = 0; i < 24; i++) row[`h${i}`] = 0;
                const bucket = worked > 0 ? worked / 9 : 0;
                for (let i = 8; i <= 16; i++) row[`h${i}`] = bucket;
                response.overallChart = [row];
            }
        }

        const render = {
            title: "RPA Dashboard",
            page: "rpaDashboard",
            uploadMode: req.query.upload === '1'
        };
        let userId = req.user.uuid;
        let checkRoles = req.user.roles;
        let arrangement = { rpadChartsStatusList: [] };
        let filters = { rpadHistoryList: [] };

        const arrangementResponse = await API.requestAsync(`${process.env.API_RPAD_CHARTS_STATUS_LIST}/${userId}`, 'GET', {}, req, res);
        const filtersResponse = await API.requestAsync(`${process.env.API_HISTORIES}/${userId}`, 'GET', {}, req, res);

        if (arrangementResponse && arrangementResponse.statusCode === 200 && arrangementResponse.rpadChartsStatusList) {
            arrangement = arrangementResponse;
        }
        if (filtersResponse && filtersResponse.statusCode === 200 && filtersResponse.rpadHistoryList) {
            filters = filtersResponse;
        }

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        // Daily Intensity is derived automatically from the Jobs upload
        // (backend autoDailyIntensity), so it is not offered as a manual upload.
        render.models = endpoints
            .filter(x => x.table !== 'RPAD_DAILY_INTENSITY')
            .map(x => x.model);
        const pageRender = {
            filters : filters,
            arrangement : arrangement,
            userId : userId,
            checkRoles : checkRoles,
            jobsData: asArray(response.jobsData),
            occupanyRobots: asArray(response.robotsOccupancyRateChart2),
            stateRobots: asArray(response.rpadStateChart2),
            rpadStateChart: asArray(response.rpadStateChart),
            workingHoursOccupancyChart: asArray(response.workingHoursOccupancyChart),
            totalJobTimeChart: asArray(response.totalJobTimeChart),
            overallChart: asArray(response.overallChart),
            robotsOccupancyRateChart: asArray(response.robotsOccupancyRateChart),
            releaseTotalTimeChart: asArray(response.releaseTotalTimeChart),
            dailyDensityChart: asArray(response.dailyDensityChart),
            queueTransactionTimeChart: asArray(response.queueTransactionTimeChart),
            queueStatusChart: asArray(response.queueStatusChart),
            aiChartSeedData: {
                jobsData: asArray(response.jobsData),
                rpadStateChart: asArray(response.rpadStateChart),
                workingHoursOccupancyChart: asArray(response.workingHoursOccupancyChart),
                totalJobTimeChart: asArray(response.totalJobTimeChart),
                overallChart: asArray(response.overallChart),
                robotsOccupancyRateChart: asArray(response.robotsOccupancyRateChart),
                releaseTotalTimeChart: asArray(response.releaseTotalTimeChart),
                dailyDensityChart: asArray(response.dailyDensityChart),
                queueTransactionTimeChart: asArray(response.queueTransactionTimeChart),
                queueStatusChart: asArray(response.queueStatusChart),
                stateRobots: asArray(response.rpadStateChart2),
                occupanyRobots: asArray(response.robotsOccupancyRateChart2)
            },
            months: months,
            years: generateArrayOfYears(),
            lastDataDateInformation: dataDateResponse.hosts || [],
            lastQueueDateInformation: dataDateResponse.robotNames || []
        }
        let newObj = Object.assign({}, render, pageRender)
        res.render('pages/rpa-dashboard', newObj);
    } catch (err) {
        console.error('[rpa-dashboard] getRpaDashboard error:', err);
        req.flash('errors', {msg: 'Dashboard data could not be loaded. Please try again.'});
        res.redirect('/500');
    }
};


exports.postRpaDashboard = async (req, res) => {
    // When the upload form posts via XHR (progress bar), answer with JSON instead
    // of a flash + redirect so the client can keep the modal open and react.
    const wantsJson = req.xhr || String(req.body.ajax) === '1';
    const settle = (kind, msg, params = []) => {
        if (wantsJson) {
            const text = (req.app.locals.message || ((m) => m))(req.__(msg), params);
            return res.json({ok: kind === 'info', kind, message: text});
        }
        req.flash(kind, {msg, params});
        return res.redirect(req.path);
    };

    try {
        const action = endpoints.find(e => toCamelCase(e.model) === req.body.model),
            file = req.file,
            invalid = validator(file);

        if (invalid) {
            return settle('errors', invalid);
        }

        if (!action) {
            return settle('errors', 'Group selection not detected or invalid. Please try again.');
        }

        // cellDates + a datetime dateNF so real Excel date/time cells keep their
        // time component (a plain 'dd/mm/yyyy' truncates every timestamp to midnight,
        // which breaks hourly/daily-intensity charts).
        const wb = XLSX.read(file.buffer, {type: 'buffer', cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss'});
        const firstSheet = wb.Sheets[wb.SheetNames[0]];

        let json = XLSX.utils.sheet_to_json(firstSheet, {
            raw: false,
            defval: '',
            skipHeader: false
        });

        // Fallback parser for files where header is not on the first row.
        if (!Array.isArray(json) || json.length === 0) {
            const matrix = XLSX.utils.sheet_to_json(firstSheet, {
                header: 1,
                raw: false,
                defval: ''
            });

            const headerIndex = Array.isArray(matrix)
                ? matrix.findIndex(row => Array.isArray(row) && row.filter(cell => `${cell}`.trim() !== '').length >= 2)
                : -1;

            if (headerIndex >= 0 && Array.isArray(matrix[headerIndex])) {
                const headers = matrix[headerIndex].map(h => `${h || ''}`.trim());
                const dataRows = matrix.slice(headerIndex + 1).filter(row =>
                    Array.isArray(row) && row.some(cell => `${cell}`.trim() !== '')
                );

                json = dataRows.map(row => {
                    const obj = {};
                    headers.forEach((h, i) => {
                        if (h) obj[h] = row[i];
                    });
                    return obj;
                });
            }
        }

        let normalizedJson = camelcaseKeys(json);
        if (action.table === 'RPAD_JOBS') {
            normalizedJson = normalizeJobsUploadRows(normalizedJson);
        }

        console.log('[upload] model:', req.body.model, '| action.table:', action.table, '| rows:', normalizedJson.length);

        if (normalizedJson.length === 0) {
            return settle('errors', 'The Excel file appears to be empty or could not be parsed. Please check the file and try again.');
        }

        if (action.table === 'RPAD_DAILY_INTENSITY') {
            const requiredHeaders = ['dataDate', 'workDate', 'hostMachineName', 'releaseName']
                .concat(Array.from({length: 24}, (_, i) => `h${i}`));
            const firstRow = normalizedJson[0] || {};
            const rowKeys = Object.keys(firstRow);
            const missing = requiredHeaders.filter(k => !rowKeys.includes(k));

            if (missing.length > 0) {
                return settle('errors', `Daily Intensity format is invalid. Missing column(s): ${missing.join(', ')}`);
            }
        }

        // UploadRequest on backend only accepts: table, list (no batchId)
        const data = await API.requestAsync(`${process.env.API_SYSTEM}/upload`, 'POST', {
            table: action.table,
            list: normalizedJson
        }, req, res);

        const statusCode = data && data.statusCode;

        if (data && data.error) {
            return settle('errors', data.error);
        }

        if (statusCode === 200) {
            if (action.table === 'RPAD_JOBS') {
                if (req.session) req.session.uploadPreviewJobs = normalizedJson;
                if (req.user && req.user.uuid) await saveUploadPreviewJobs(req.user.uuid, normalizedJson);
            }
            return settle('info', '# row(s) have been processed.', [json.length]);
        } else if (statusCode === 406) {
            const arr = ((data && data.error) || '').split(' - ');
            return settle('errors', arr[0] + ': #', [arr[1]]);
        } else if (statusCode === 400) {
            let errMsg = (data && data.error) ? data.error : 'Bad request – please check the file format and try again.';
            if (errMsg === 'Request is incorrect.' || errMsg === 'İstek hatalı.') {
                errMsg = 'İstek hatalı. Lütfen doğru modeli (Jobs/Queues/Daily Intensity) seçtiğinizden, Excel dosyasının ilk sayfasında başlık satırı + en az 1 veri satırı olduğundan ve dosyanın .xlsx formatında olduğundan emin olun.';
            }
            return settle('errors', errMsg);
        } else {
            const errMsg = (data && data.error) ? data.error : 'An unknown error has occurred. Please contact us.';
            return settle('errors', errMsg);
        }
    } catch (err) {
        console.error('[rpa-dashboard] postRpaDashboard error:', err);
        if (!res.headersSent) {
            return settle('errors', 'Upload failed. Please try again.');
        }
    }
};

