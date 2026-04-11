const markdown = require("markdown").markdown;
const API = require('../rest/api');
const XLSX = require('xlsx');
const path = require('path');
const camelcaseKeys = require('camelcase-keys');
const fs = require('fs');
const uuidv4 = require('uuid/v4');

function validator(file) {
    if (!file) return "No File Selected";

    file.filename = uuidv4() + path.extname(file.originalname);

    if (!`${process.env.ACCEPTABLE_FILE_TYPE}`.split(',').includes(path.extname(file.filename).split('.').pop())) return "Invalid file type";

    if (file.size > `${process.env.ACCEPTABLE_FILE_SIZE}` * 1024 * 1024) return "File size is too large";

    return false;
}

exports.getDeadlines = async (req, res) => {
    req.session._deadline_ = null;

    const render = {
        title: 'Deadlines',
        page: "deadlines",
        objects: [
            {
                key: "deadlines",
                name: "deadlines",
                uri: `${process.env.API_DEADLINE}`,
                method: 'GET',
                data: req.query.q
            },
            {
                key: "subsidiaries",
                name: "subsidiariesLimited",
                uri: `${process.env.API_SUBSIDIARY_LIMITED}`,
                method: 'GET',
                data: {}
            }
        ]
    };

    await API.renderer(req, res, render);
};

exports.postDeadlines = async (req, res) => {
    req.session._deadline_ = null;
    let action = req.body.action;

    if ('new' === action) {
        return res.redirect('/deadline/new');
    } else if ('import' === action) {
        const file = req.file,
            invalid = validator(file);

        if (invalid) {
            req.flash('errors', {msg: invalid});
            return res.redirect('/deadlines');
        } else {
            const wb = XLSX.read(file.buffer, {type: 'buffer', dateNF: 'dd/mm/yyyy'}),
                json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
                    raw: false,
                    columns: true,
                    skipHeader: false
                });

            let request = [{
                uri: `${process.env.API_DEADLINE}`,
                method: 'POST',
                data: {
                    deadlines: camelcaseKeys(json)
                }
            }];
            let responses = await API.responser(req, res, request);

            if (responses.hasOwnProperty(208)) {
                req.flash('info', {
                    msg: (req.__('DeadlineExist')),
                    params: responses[208][request[0].uri].error.split(" - ").reverse()
                });
                return res.redirect(req.path);
            } else if (responses.hasOwnProperty(406)) {
                let arr = responses[406][request[0].uri].error.split(" - ");
                req.flash('errors', {msg: (req.__('WrongSubsidiary')), params: [req.__(arr[0]), arr[1]]}
                );
                return res.redirect(req.path);
            } else if (responses.hasOwnProperty(200)) {

                function isValidDate(strDate) {
                    var dateParts = strDate.split("/");
                    var date = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
                    return date.getDate() == dateParts[0]
                        && date.getMonth() == (dateParts[1] - 1)
                        && date.getFullYear() == dateParts[2] && strDate.trim().length == 10;

                }

                for (let row = 0; row < json.length; row++) {
                    let response = responses[200][request[0].uri].deadlines[row];

                    var isValid = isValidDate(response.reportDate) && isValidDate(response.dueDate);

                    let reportTypeControl = response.reportType.replace("\n", " ").split('\r');
                    var reportTypeError = reportTypeControl.filter(item => item.includes("Daily") || item.includes("Monthly")).length;
                }

                if (!isValid || reportTypeError > 1)
                    req.flash('errors', {msg: req.__('Data format error.')});
                else
                    req.flash('success', {msg: 'The operation completed successfully.'});

                return res.redirect(req.path);

            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(req.path);
            }
        }
    } else {
        return res.redirect('/deadlines');
    }
};

exports.getDeadline = async (req, res) => {
    let deadline = req.session._deadline_,
        uuid = req.params.uuid;

    const render = {
        title: 'Deadline',
        page: "deadline",
        objects: [{
            key: "subsidiaries",
            name: "subsidiariesLimited",
            uri: `${process.env.API_SUBSIDIARY_LIMITED}`,
            method: 'GET',
            data: {}
        }]
    };

    if ('new' !== uuid && !deadline) {
        render.objects.push({
            key: 'deadline',
            name: 'deadline',
            uri: `${process.env.API_DEADLINE}/${uuid}`,
            method: 'GET',
            data: {}
        });
    }

    let responses = await API.responser(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        deadline = render.deadline ? render.deadline : (deadline ? deadline : {subsidiaries: []});
        deadline.reportDates = Array.isArray(deadline.reportDates) && deadline.reportDates.length > 0 ? deadline.reportDates.join() : "";
        render.deadline = deadline;

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

exports.postDeadline = async (req, res) => {
    let uuid = req.params.uuid,
        body = req.body,
        action = body.action;

    if ('new' === action) {
        req.session._deadline_ = null;
        return res.redirect('/deadline/new');
    } else {
        req.session._deadline_ = body;

        let request = [];
        switch (action) {
            case 'save':
                body.status = body.status === 'on' ? 1 : 2;
                body.reportDates = body.reportDates ? body.reportDates.split(',') : [];
                body.subsidiaries = body.subsidiaries ? (Array.isArray(body.subsidiaries) ? body.subsidiaries : [body.subsidiaries]) : [];
                request.push({uri: `${process.env.API_DEADLINE}`, method: 'POST', data: {deadline: body}});
                break;
            case 'update':
                body.status = body.status === 'on' ? 1 : 2;
                body.reportDates = body.reportDates ? body.reportDates.split(',') : [];
                body.subsidiaries = body.subsidiaries ? (Array.isArray(body.subsidiaries) ? body.subsidiaries : [body.subsidiaries]) : [];
                request.push({uri: `${process.env.API_DEADLINE}/${uuid}`, method: 'PUT', data: {deadline: body}});
                break;
            case 'delete':
                request.push({uri: `${process.env.API_DEADLINE}/${uuid}`, method: 'DELETE', data: {}});
                break;
            default:
                req.flash('warnings', {msg: 'Action selection was not made or could not be done correctly. Please try again.'});
                return res.redirect(req.path);
        }

        let responses = await API.responser(req, res, request);

        if (responses.hasOwnProperty(208)) {
            req.flash('info', {msg: 'The # deadline definition already exists for #', params: data.error.split(" - ")});
            return res.redirect(req.path);
        } else if (responses.hasOwnProperty(200)) {
            req.session._deadline_ = null;
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect('update' === action ? req.path : '/deadlines');
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }

    }
};
