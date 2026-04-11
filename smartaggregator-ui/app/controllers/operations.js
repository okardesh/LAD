const API = require('../rest/api');
const markdown = require("markdown").markdown;

exports.getOperations = async (req, res) => {
    req.session._operation_ = null;

    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_OPERATIONS}`, method: 'GET', data: req.query.q});

    for (const path of paths) {
        let data = await API.requestAsync(path.uri, path.method, path.data, req, res);

        if (data && data.statusCode === 403)
            permissionErrors.push(path.uri);
        else if (data && data.statusCode === 200)
            responses[path.uri] = data;
    }

    if (permissionErrors.length > 0) {
        req.flash('error', {permissionErrors: permissionErrors});
        res.redirect('/403');
    } else if (Object.keys(responses).length === paths.length) {
        res.render('pages/operations', {
            title: 'Operations',
            operations: responses[`${process.env.API_OPERATIONS}`].operations,
            info: markdown.toHTML(req.__('info.operations'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.getOperation = async (req, res) => {
    const uuid = req.params.uuid,
        permissionErrors = [],
        responses = {},
        paths = [];
    paths.push({uri: `${process.env.API_OPERATIONS}/${uuid}`, method: 'GET', data: {}});

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
        res.render('pages/operation', {
            title: 'Operation',
            operation: responses[`${process.env.API_OPERATIONS}/${uuid}`].operation,
            info: markdown.toHTML(req.__('info.operation'))
        });
    } else {
        return res.redirect('/500');
    }

};