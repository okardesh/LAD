const markdown = require("markdown").markdown;

const API = require('../rest/api');

exports.getParameters = async (req, res) => {
    req.session._parameters_ = null;

    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_PARAMETERS}`, method: 'GET', data: req.query.q});

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
        res.render('pages/parameters', {
            title: 'Parameters',
            parameters: responses[`${process.env.API_PARAMETERS}`].parameters,
            info: markdown.toHTML(req.__('info.parameters'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postParameters = (req, res, next) => {
    req.session._parameters_ = null;

    let parameter = req.body,
        action = parameter.action;

    if ('new' === action) {
        return res.redirect('/parameter/new');
    } else {
        return res.redirect('/parameters');
    }
};

exports.getParameter = async (req, res) => {
    let _parameters_ = req.session._parameters_,
        uuid = req.params.uuid;

    if (_parameters_) {
        res.render('pages/parameter', {
            title: 'Parameter',
            parameter: _parameters_,
            info: markdown.toHTML(req.__('info.parameter'))
        });
    } else {
        if ('new' === uuid) {
            res.render('pages/parameter', {title: 'Parameter', parameter: {}, info: markdown.toHTML(req.__('info.parameter'))});
        } else {
            const permissionErrors = [],
                responses = {},
                paths = [];

            paths.push({uri: `${process.env.API_PARAMETERS}/${uuid}`, method: 'GET', data: {}});

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
                res.render('pages/parameter', {
                    title: 'Parameter',
                    parameter: responses[`${process.env.API_PARAMETERS}/${uuid}`].parameter,
                    info: markdown.toHTML(req.__('info.parameter'))
                });
            } else {
                return res.redirect('/500');
            }
        }
    }
};

exports.postParameter = (req, res, next) => {
    let uuid = req.params.uuid,
        parameter = req.body,
        action = parameter.action,
        permissionErrors = [];

    if ('new' === action) {
        req.session._parameters_ = null;
        return res.redirect('/parameter/new');
    } else if ('save' === action) {
        req.session._parameters_ = parameter;
        API.request(`${process.env.API_PARAMETERS}`, 'POST', {parameter: parameter}, req, res, function (data) {
            if (data && data.statusCode === 200) {
                req.session._parameters_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect('/parameters');
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_PARAMETERS}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect('/parameter/new');
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect('/parameter/new');
            }
        });
    } else if ('update' === action) {
        req.session._parameters_ = parameter;
        API.request(`${process.env.API_PARAMETERS}/${uuid}`, 'PUT', {parameter: parameter}, req, res, function (data) {
            if (data && data.statusCode === 200) {
                req.session._parameters_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect(`/parameter/${uuid}`);
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_PARAMETERS}/${uuid}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect(`/parameter/${uuid}`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/parameter/${uuid}`);
            }
        });
    } else if ('delete' === action) {
        req.session._parameters_ = null;
        API.request(`${process.env.API_PARAMETERS}/${uuid}`, 'DELETE', {}, req, res, function (data) {
            if (data && data.statusCode === 200) {
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect('/parameters');
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_PARAMETERS}/${uuid}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect(`/parameter/${uuid}`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/parameter/${uuid}`);
            }
        });
    } else {
        return res.redirect(`/parameter/${uuid}`);
    }
};