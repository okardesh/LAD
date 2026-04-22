const API = require('../rest/api');
const s3 = require('../config/s3config');

const imgs = {};

async function setImgs(arr) {
    if (!Array.isArray(arr)) return [];

    for (let i = 0; i < arr.length; i++) {
        if (arr[i].logo) {
            if (!imgs.hasOwnProperty(arr[i].uuid) || imgs[arr[i].uuid].icon !== arr[i].logo) {
                imgs[arr[i].uuid] = {icon: arr[i].logo, img: await s3.getImage(arr[i].logo + '.png')}
            }

            arr[i].img = imgs[arr[i].uuid].img;
        }
    }

    return arr;
}

function generateArrayOfYears() {
    var max = new Date().getFullYear()
    var min = max - 11
    var years = []

    for (var i = max - 1; i >= min; i--) {
      years.push(i)
    }
    return years
  }

exports.getRobotList = async (req, res) => {
    var user = req.user;
    var months = [{key:1, name:'Ocak'},{key:2, name:'Şubat'},{key:3, name:'Mart'},{key:4, name:'Nisan'},{key:5, name:'Mayıs'},{key:6, name:'Haziran'},
                  {key:7, name:'Temmuz'},{key:8, name:'Ağustos'},{key:9, name:'Eylül'},{key:10, name:'Ekim'},{key:11, name:'Kasım'},{key:12, name:'Aralık'}];
    var response = {};
    var filters = {};
    var dropdown = {
        branchName: [],
        branchType: [],
        regionName: [],
        segment: [],
        stage: []
    };

    if (!user) {
        return res.redirect('/login');
    }

    try {
        let report = await API.requestAsync(`${process.env.API_DASHBOARD_TABLE}/rpad`, 'GET', {}, req, res);
        if (report && report.statusCode === 200) {
            response = report.rpad || {};
        }

        filters = await API.requestAsync(`${process.env.API_FILTER_DROPDOWN}`, 'GET', {}, req, res) || {};
        if (filters.statusCode === 200 && filters.filterDropdown) {
            dropdown = Object.assign({}, dropdown, filters.filterDropdown)
            dropdown.branchName = Array.isArray(dropdown.branchName) ? dropdown.branchName : []
            dropdown.branchType = Array.isArray(dropdown.branchType) ? dropdown.branchType : []
            dropdown.regionName = Array.isArray(dropdown.regionName) ? dropdown.regionName : []
            dropdown.segment = Array.isArray(dropdown.segment) ? dropdown.segment : []
            dropdown.stage = Array.isArray(dropdown.stage) ? dropdown.stage : []

            dropdown.branchName.sort(function (a, b) { return a.localeCompare(b); });
            dropdown.branchType.sort(function (a, b) { return a.localeCompare(b); });
            dropdown.regionName.sort(function (a, b) { return a.localeCompare(b); });
            dropdown.segment.sort(function (a, b) { return a.localeCompare(b); });
            dropdown.stage.sort(function(a, b){return a - b});
        }
    } catch (err) {
        console.error('data-list controller error:', err);
    }

    const robots = Array.isArray(response && response.robots) ? response.robots : [];
    const hosts = Array.isArray(response && response.hosts) ? response.hosts : [];
    const dailyIntensity = Array.isArray(response && response.dailyIntensity) ? response.dailyIntensity : [];
    const jobs = Array.isArray(response && response.jobs) ? response.jobs : [];

    return res.render('pages/data-list', {
        title: 'Data List',
        page: 'dataList',
        robots: robots,
        hosts: hosts,
        dailyIntensity: dailyIntensity,
        jobs: jobs,
        months: months,
        years: generateArrayOfYears(),
        filters: filters,
        dropdown: dropdown,
    });
};
