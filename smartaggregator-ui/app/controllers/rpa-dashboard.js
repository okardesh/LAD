const API = require('../rest/api');
const XLSX = require('xlsx');
const path = require('path');
const markdown = require("markdown").markdown;
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const camelcaseKeys = require("camelcase-keys");

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
        const previewJobs = req.session && Array.isArray(req.session.uploadPreviewJobs)
            ? req.session.uploadPreviewJobs
            : [];

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
    const action = endpoints.find(e => toCamelCase(e.model) === req.body.model),
        file = req.file,
        invalid = validator(file);

    if (invalid) {
        req.flash('errors', {msg: invalid});
        return res.redirect(req.path);
    } else if (!action) {
        req.flash('errors', {msg: 'Group selection not detected or invalid. Please try again.'});
        return res.redirect(req.path);
    } else {
        const wb = XLSX.read(file.buffer, {type: 'buffer', dateNF: 'dd/mm/yyyy'}),
            json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
                raw: false,
                columns: true,
                skipHeader: false
            });
        let request = [{
            uri: `${process.env.API_SYSTEM}/upload`,
            method: 'POST',
            data: {
                batchId: path.parse(file.filename).name,
                table: action.table,
                list: camelcaseKeys(json)
            }
        }];

        let responses = await API.responser(req, res, request);

        if (responses.hasOwnProperty(406)) {
            const arr = responses[406][request[0].uri].error.split(' - ');
            req.flash('errors', {
                msg: arr[0] + ': #',
                params: [arr[1]]
            });
            return res.redirect(req.path);
        } else if (responses.hasOwnProperty(200)) {
            req.flash('info', {
                msg: req.__('# row(s) have been processed.'),
                params: [json.length]
            });
            return res.redirect(req.path);
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }
    }
};

