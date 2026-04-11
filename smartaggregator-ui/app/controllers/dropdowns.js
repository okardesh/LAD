const markdown = require("markdown").markdown;

const API = require('../rest/api');

exports.getDropdowns = async (req, res) => {
    req.session._dropdowns_ = null;

    const permissionErrors = [],
        responses = {},
        paths = [];



    paths.push({uri: `${process.env.API_DROPDOWNS}`, method: 'GET', data: req.query.q});

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
        res.render('pages/dropdowns', {
            title: 'Dropdowns',
            dropdowns: responses[`${process.env.API_DROPDOWNS}`].dropdowns,
            info: markdown.toHTML(req.__('info.dropdowns'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postDropdowns = (req, res, next) => {
    req.session._dropdowns_ = null;
    var dropdown = req.body;
    var action = dropdown.action;
    var uuid = dropdown.uuid;
    if ('new' === action) {
        return res.redirect('/dropdown/new');
    } else {
        req.session._dropdown_ = dropdown;
        API.request(`${process.env.API_DROPDOWNS}/${uuid}/${action}`, 'POST', {dropdown: dropdown}, req, res, function (data) {
            if (data && data.statusCode === 200) {
                req.session._dropdown_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect(`/dropdowns`);
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_DROPDOWNS}/${uuid}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.statusCode === 409 && action === "approve") {
                req.flash('errors', {msg: 'You cannot confirm your own registration.'});
                return res.redirect(`/dropdowns`);
            } else if (data && data.statusCode === 410 && action === "cancel") {
                req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
                return res.redirect(`/dropdowns`);
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect(`/dropdowns`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/dropdowns`);
            }
        });
    }
};

exports.getDropdown = async (req, res) => {
    let _dropdown_ = req.session._dropdown_,
        uuid = req.params.uuid;

    const permissionErrors = [],
        responses = {},
        paths = [];

    if ('new' !== uuid && !_dropdown_) {
        paths.push({uri: `${process.env.API_DROPDOWNS}/${uuid}`, method: 'GET', data: {}});
    }


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
        if (responses.hasOwnProperty(`${process.env.API_DROPDOWNS}/${uuid}`)) {
            _dropdown_ = responses[`${process.env.API_DROPDOWNS}/${uuid}`].dropdown;
        } else if (!_dropdown_) _dropdown_ = {items: []};


        res.render('pages/dropdown', {
            title: 'Dropdown',
            dropdown: _dropdown_,
            info: markdown.toHTML(req.__('info.dropdown'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postDropdown = (req, res, next) => {
    let uuid = req.params.uuid,
        dropdown = req.body,
        action = dropdown.action,
        permissionErrors = [];

    dropdown.items = dropdown.items ? JSON.parse(dropdown.items) : {};

    if ('new' === action) {
        req.session._dropdown_ = null;
        return res.redirect('/dropdown/new');
    } else if ('save' === action) {
        req.session._dropdown_ = dropdown;
        dropdown.status = dropdown.status === 'on' ? 1 : 2;
        API.request(`${process.env.API_DROPDOWNS}`, 'POST', {dropdown: dropdown}, req, res, function (data) {
            if (data && data.statusCode === 200) {
                req.session._dropdown_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect('/dropdowns');
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_DROPDOWNS}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.statusCode === 409 && action === "approve") {
                req.flash('errors', {msg: 'You cannot confirm your own registration.'});
                return res.redirect(`/dropdowns`);
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect('/dropdown/new');
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect('/dropdown/new');
            }
        });
    } else if ('update' === action) {
        req.session._dropdown_ = dropdown;
        dropdown.status = dropdown.status === 'on' ? 1 : 2;
        API.request(`${process.env.API_DROPDOWNS}/${uuid}`, 'PUT', {dropdown: dropdown}, req, res, function (data) {
            if (data && data.statusCode == 200) {
                req.session._dropdown_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect(`/dropdown/${uuid}`);
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_DROPDOWNS}/${uuid}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.statusCode === 406) {
                req.flash('errors', {msg: 'To update, the registration status must be new or rejected.'});
                return res.redirect(`/dropdown/${uuid}`);
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect(`/dropdown/${uuid}`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/dropdown/${uuid}`);
            }
        });
    } else if ('delete' === action) {
        req.session._dropdown_ = null;
        API.request(`${process.env.API_DROPDOWNS}/${uuid}`, 'DELETE', {}, req, res, function (data) {
            if (data && data.statusCode == 200) {
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect('/dropdowns');
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_DROPDOWNS}/${uuid}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect(`/dropdown/${uuid}`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/dropdown/${uuid}`);
            }
        });
    } else {
        req.session._dropdown_ = dropdown;
        dropdown.status = dropdown.status === 'on' ? 1 : 2;
        API.request(`${process.env.API_DROPDOWNS}/${uuid}/${action}`, 'POST', {dropdown: dropdown}, req, res, function (data) {
            if (data && data.statusCode === 200) {
                req.session._dropdown_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect(`/dropdown/${uuid}`);
            } else if (data && data.statusCode === 403) {
                permissionErrors.push(`${process.env.API_DROPDOWNS}/${uuid}`);
                req.flash('error', {permissionErrors: permissionErrors});
                res.redirect('/403');
            } else if (data && data.statusCode === 409 && action === "approve") {
                req.flash('errors', {msg: 'You cannot confirm your own registration.'});
                return res.redirect(`/dropdown/${uuid}`);
            } else if (data && data.statusCode === 410 && action === "cancel") {
                req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
                return res.redirect(`/dropdown/${uuid}`);
            } else if (data && data.error) {
                req.flash('errors', {msg: data.error});
                return res.redirect(`/dropdown/${uuid}`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/dropdown/${uuid}`);
            }
        });
    }
};