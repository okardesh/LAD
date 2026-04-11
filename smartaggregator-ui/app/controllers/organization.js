const markdown = require("markdown").markdown;
const path = require('path');
const API = require('../rest/api');
const s3 = require('../config/s3config');

function validator(file) {
    if (`${process.env.ACCEPTABLE_LOGO_TYPE}` !== path.extname(file.originalname)) return "Invalid file type";

    if (file.size > `${process.env.ACCEPTABLE_LOGO_SIZE}` * 1024 * 1024) return "File size is too large";

    return false;
}

exports.getOrganization = async (req, res) => {
    req.session._organization_ = null;

    const permissionErrors = [],
        responses = {},
        paths = [];
    paths.push({uri: `${process.env.API_ORGANIZATION}`, method: 'GET', data: {}});

    for (const p of paths) {
        let data = await API.requestAsync(p.uri, p.method, p.data, req, res);

        if (data && data.statusCode === 403)
            permissionErrors.push(p.uri);
        else if (data && data.statusCode === 200)
            responses[p.uri] = data;
    }

    if (permissionErrors.length > 0) {
        res.statusCode = 403;
        req.flash('error', {permissionErrors: permissionErrors});
        res.redirect('/403');
    } else if (Object.keys(responses).length === paths.length) {
        let org = responses[`${process.env.API_ORGANIZATION}`].organization;
        req.session._organization_ = org;
        if (org.logo) org.img = await s3.getImage(org.logo + '.png');
        res.render('pages/organization', {
            organization: org,
            info: markdown.toHTML(req.__('info.organization'))
        });
    } else {
        return res.redirect('/500');
    }
};

exports.postOrganization = async (req, res, next) => {
    let organization = req.body,
        file = req.file;

    if (file) {
        let invalid = validator(file);

        if (invalid) {
            req.flash('errors', {msg: invalid});
            return res.redirect(req.path);
        } else organization.logo = path.parse(file.key).name;
    }

    req.session._organization_ = organization;

    let data = await API.requestAsync(`${process.env.API_ORGANIZATION}`, 'PUT', {organization: organization}, req, res);

    if (data && data.error) {
        req.flash('errors', {msg: data.error});
        return res.redirect(req.path);
    } else if (data && data.statusCode === 403) {
        res.redirect(req.path);
    } else if (data && data.statusCode === 200) {
        req.user.organization.logo = req.session._organization_.logo;
        req.session._organization_ = null;
        req.flash('success', {msg: 'The operation completed successfully.'});
        return res.redirect(req.path);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};
