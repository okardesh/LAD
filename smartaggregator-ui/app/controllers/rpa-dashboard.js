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
        let previewJobs = req.session && Array.isArray(req.session.uploadPreviewJobs)
            ? req.session.uploadPreviewJobs
            : [];

        if ((!previewJobs || !previewJobs.length) && req.user && req.user.uuid) {
            previewJobs = await loadUploadPreviewJobs(req.user.uuid);
            if (req.session && previewJobs.length) req.session.uploadPreviewJobs = previewJobs;
        }

        if (previewJobs && previewJobs.length && req.user && req.user.uuid) {
            // Backfill persistent cache from session on read path.
            await saveUploadPreviewJobs(req.user.uuid, previewJobs);
        }

        if (previewJobs.length) {
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
                    .map(j => j && j.dataDate)
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
                    .map(j => j && j.dataDate)
                    .filter(Boolean)
                    .slice(-1)[0] || null;
                dataDateResponse.robotNames = robots.map(r => ({
                    robotName: r.hostMachineName,
                    lastQueueDate: latestDate
                }));
            }
        }

        const render = {
            title: "RPA Dashboard",
            page: "rpaDashboard",
            uploadMode: req.query.upload === '1'
        };
        let userId = req.user.uuid;
        let checkRoles = req.user.roles;
        let arrangement = await API.requestAsync( `${process.env.API_RPAD_CHARTS_STATUS_LIST}/${userId}` , 'GET' , {} , req,res)
        let filters = await API.requestAsync( `${process.env.API_HISTORIES}/${userId}` , 'GET', {} , req,res)
        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        render.models = endpoints.map(x => x.model);
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
    try {
        const action = endpoints.find(e => toCamelCase(e.model) === req.body.model),
            file = req.file,
            invalid = validator(file);

        if (invalid) {
            req.flash('errors', {msg: invalid});
            return res.redirect(req.path);
        }

        if (!action) {
            req.flash('errors', {msg: 'Group selection not detected or invalid. Please try again.'});
            return res.redirect(req.path);
        }

        const wb = XLSX.read(file.buffer, {type: 'buffer', dateNF: 'dd/mm/yyyy'});
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

        const normalizedJson = camelcaseKeys(json);

        console.log('[upload] model:', req.body.model, '| action.table:', action.table, '| rows:', normalizedJson.length);
        if (normalizedJson.length > 0) console.log('[upload] first row keys:', Object.keys(normalizedJson[0]));

        if (normalizedJson.length === 0) {
            req.flash('errors', {msg: 'The Excel file appears to be empty or could not be parsed. Please check the file and try again.'});
            return res.redirect(req.path);
        }

        if (action.table === 'RPAD_DAILY_INTENSITY') {
            const requiredHeaders = ['dataDate', 'workDate', 'hostMachineName', 'releaseName']
                .concat(Array.from({length: 24}, (_, i) => `h${i}`));
            const firstRow = normalizedJson[0] || {};
            const rowKeys = Object.keys(firstRow);
            const missing = requiredHeaders.filter(k => !rowKeys.includes(k));

            if (missing.length > 0) {
                req.flash('errors', {
                    msg: `Daily Intensity format is invalid. Missing column(s): ${missing.join(', ')}`
                });
                return res.redirect(req.path);
            }
        }

        // UploadRequest on backend only accepts: table, list (no batchId)
        const data = await API.requestAsync(`${process.env.API_SYSTEM}/upload`, 'POST', {
            table: action.table,
            list: normalizedJson
        }, req, res);

        const statusCode = data && data.statusCode;

        if (statusCode === 200) {
            if (action.table === 'RPAD_JOBS') {
                if (req.session) req.session.uploadPreviewJobs = normalizedJson;
                if (req.user && req.user.uuid) await saveUploadPreviewJobs(req.user.uuid, normalizedJson);
            }
            req.flash('info', {
                msg: req.__('# row(s) have been processed.'),
                params: [json.length]
            });
            return res.redirect(req.path);
        } else if (statusCode === 406) {
            const arr = ((data && data.error) || '').split(' - ');
            req.flash('errors', {
                msg: arr[0] + ': #',
                params: [arr[1]]
            });
            return res.redirect(req.path);
        } else if (statusCode === 400) {
            let errMsg = (data && data.error) ? data.error : 'Bad request – please check the file format and try again.';
            if (errMsg === 'Request is incorrect.' || errMsg === 'İstek hatalı.') {
                errMsg = 'İstek hatalı. Lütfen doğru modeli (Jobs/Queues/Daily Intensity) seçtiğinizden, Excel dosyasının ilk sayfasında başlık satırı + en az 1 veri satırı olduğundan ve dosyanın .xlsx formatında olduğundan emin olun.';
            }
            req.flash('errors', {msg: errMsg});
            return res.redirect(req.path);
        } else {
            const errMsg = (data && data.error) ? data.error : 'An unknown error has occurred. Please contact us.';
            req.flash('errors', {msg: errMsg});
            return res.redirect(req.path);
        }
    } catch (err) {
        console.error('[rpa-dashboard] postRpaDashboard error:', err);
        if (!res.headersSent) {
            req.flash('errors', {msg: 'Upload failed. Please try again.'});
            return res.redirect('/rpa-dashboard');
        }
    }
};

