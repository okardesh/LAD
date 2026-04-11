const markdown = require("markdown").markdown;
const path = require('path');
const API = require('../rest/api');
const s3 = require('../config/s3config');

function validator(file) {
    if (`${process.env.ACCEPTABLE_LOGO_TYPE}` !== path.extname(file.originalname)) return "Invalid file type";

    if (file.size > `${process.env.ACCEPTABLE_LOGO_SIZE}` * 1024 * 1024) return "File size is too large";

    return false;
}

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

exports.getSubsidiaries = async (req, res) => {
    req.session._subsidiary_ = null;

    const render = {
        title: 'Companies',
        page: "companies",
        objects: [
            {
                key: "subsidiaries",
                name: "subsidiaries",
                uri: `${process.env.API_SUBSIDIARY}`,
                method: 'GET',
                data: req.query.q
            }
        ]
    };

    let responses = await API.responser(req, res, render.objects);

    if (res.headersSent) return;

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        render.subsidiaries.content = await setImgs(render.subsidiaries.content);

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

exports.postSubsidiaries = async (req, res) => {
    req.session._subsidiary_ = null;

    let body = req.body,
        uuid = body.uuid,
        action = body.action;

    if ('new' === action) {
        return res.redirect('/company/new');
    } else {
        if (!['approve', 'cancel', 'reject', 'sendForApproval'].includes(action)) {
            req.flash('warnings', {msg: 'Action selection was not made or could not be done correctly. Please try again.'});
            return res.redirect(req.path);
        }

        let request = [];
        request.push({
            uri: `${process.env.API_SUBSIDIARY}/${uuid}/${action}`,
            method: 'POST',
            data: {subsidiary: body}
        });

        let responses = await API.responser(req, res, request);

        if (res.headersSent) return;

        if (responses.hasOwnProperty(409)) {
            req.flash('errors', {msg: 'You cannot confirm your own registration.'});
            return res.redirect(req.path);
        } else if (responses.hasOwnProperty(410)) {
            req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
            return res.redirect(req.path);
        } else if (responses.hasOwnProperty(200)) {
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect(req.path);
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }
    }
};

exports.getSubsidiary = async (req, res) => {
    let subsidiary = req.session._subsidiary_,
        uuid = req.params.uuid;

    const render = {
        title: 'Company',
        page: "company",
        objects: []
    };

    if ('new' !== uuid && !subsidiary) {
        render.objects.push({
            key: 'subsidiary',
            name: 'subsidiary',
            uri: `${process.env.API_SUBSIDIARY}/${uuid}`,
            method: 'GET',
            data: {}
        });
    }

    let responses = await API.responser(req, res, render.objects);

    if (res.headersSent) return;

    if (render.objects.length === 0 || Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        render.subsidiary = render.subsidiary || subsidiary || {};
        if (render.subsidiary.logo) render.subsidiary.img = await s3.getImage(render.subsidiary.logo + '.png');

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

exports.postSubsidiary = async (req, res) => {
    let uuid = req.params.uuid,
        body = req.body,
        action = body.action;

    if ('new' === action) {
        req.session._subsidiary_ = null;
        return res.redirect('/company/new');
    } else {
        const file = req.file;

        if (file) {
            let invalid = validator(file);

            if (invalid) {
                req.flash('errors', {msg: invalid});
                return res.redirect(req.path);
            } else body.logo = path.parse(file.key).name;
        }

        let request = [];
        switch (action) {
            case 'save':
                req.session._subsidiary_ = body;
                body.status = body.status === 'on' ? 1 : 2;
                body.financial = body.financial[0] === 'on' ? 1 : 0;
                request.push({uri: `${process.env.API_SUBSIDIARY}`, method: 'POST', data: {subsidiary: body}});
                break;
            case 'update':
                req.session._subsidiary_ = body;
                body.status = body.status === 'on' ? 1 : 2;
                body.financial = body.financial[0] === 'on' ? 1 : 0;
                request.push({uri: `${process.env.API_SUBSIDIARY}/${uuid}`, method: 'PUT', data: {subsidiary: body}});
                break;
            case 'delete':
                request.push({uri: `${process.env.API_SUBSIDIARY}/${uuid}`, method: 'DELETE', data: {}});
                break;
            default: {
                if (['approve', 'cancel', 'sendForApproval', 'reject'].includes(action)) {
                    request.push({
                        uri: `${process.env.API_SUBSIDIARY}/${uuid}/${action}`,
                        method: 'POST',
                        data: {subsidiary: body}
                    });
                } else {
                    req.flash('warnings', {msg: 'Action selection was not made or could not be done correctly. Please try again.'});
                    return res.redirect(req.path);
                }
            }
        }

        let responses = await API.responser(req, res, request);

        if (res.headersSent) return;

        if (responses.hasOwnProperty(406)) {
            req.flash('errors', {msg: 'To update, the registration status must be new or rejected.'});
            return res.redirect(req.path);
        } else if (responses.hasOwnProperty(409)) {
            req.flash('errors', {msg: 'You cannot confirm your own registration.'});
            return res.redirect(req.path);
        } else if (responses.hasOwnProperty(410)) {
            req.flash('errors', {msg: 'Cannot be canceled without being reject.'});
            return res.redirect(req.path);
        } else if (responses.hasOwnProperty(200)) {
            req.session._subsidiary_ = null;
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect(['save', 'delete','update'].includes(action) ? '/companies' : '/companies');
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }
    }
};
