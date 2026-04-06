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

        const render = {
            title: "RPA Dashboard",
            page: "rpaDashboard"
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
            jobsData:response.jobsData,
            occupanyRobots:response.robotsOccupancyRateChart2,
            stateRobots:response.rpadStateChart2,
            rpadStateChart: response.rpadStateChart,
            workingHoursOccupancyChart: response.workingHoursOccupancyChart,
            totalJobTimeChart:response.totalJobTimeChart,
            overallChart:response.overallChart,
            robotsOccupancyRateChart: response.robotsOccupancyRateChart,
            releaseTotalTimeChart:response.releaseTotalTimeChart,
            dailyDensityChart:response.dailyDensityChart,
            queueTransactionTimeChart:response.queueTransactionTimeChart,
            queueStatusChart:response.queueStatusChart,
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
        res.redirect('/rpa-dashboard');
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

