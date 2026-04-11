const markdown = require( "markdown" ).markdown;

const API = require('../rest/api');

exports.getApplicationLogs = async (req, res) => {
    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_LOGS}`, method: 'GET', data: req.query.q});

    for (const path of paths) {
        let data = await API.requestAsync(path.uri, path.method, path.data, req, res);

        if (data && data.statusCode === 403)
            permissionErrors.push(path.uri);
        else if (data && data.statusCode === 200)
            responses[path.uri] = data;
    }

    if (permissionErrors.length > 0) {
        res.redirect('/403');
    } else if (Object.keys(responses).length === paths.length) {
        res.render('pages/applicationLogs', {
            title: 'ApplicationLogs',
            applicationLogs: responses[`${process.env.API_LOGS}`].applicationLogs,
            info: markdown.toHTML(req.__('info.applicationLogs'))
        });
    }  else {
        return res.redirect('/500');
    }
};

exports.getApplicationLog = async (req, res) => {
    const uuid = req.params.uuid,
        permissionErrors = [],
        responses = {},
        paths = [];
    paths.push({uri: `${process.env.API_LOGS}/${uuid}`, method: 'GET', data: {}});

    for (const path of paths) {
        let data = await API.requestAsync(path.uri, path.method, path.data, req, res);

        if (data && data.statusCode === 403)
            permissionErrors.push(path.uri);
        else if (data && data.statusCode === 200)
            responses[path.uri] = data;
    }

    if (permissionErrors.length > 0) {
        res.statusCode = 403;
        req.flash('error', {permissionErrors: permissionErrors});
        res.redirect('/403');
    } else if (Object.keys(responses).length === paths.length) {
        res.render('pages/applicationLog', {
            title: 'ApplicationLogs',
            applicationLog: responses[`${process.env.API_LOGS}/${uuid}`].applicationLog,
            info: markdown.toHTML(req.__('info.applicationLog'))
        });
    }  else {
        return res.redirect('/500');
    }
};