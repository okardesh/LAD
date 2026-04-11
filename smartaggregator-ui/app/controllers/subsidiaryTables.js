const markdown = require("markdown").markdown;

const API = require('../rest/api');

exports.getSubsidiaryTables = async (req, res) => {
    const render = {
        title: 'Subsidiary Tables',
        page: "subsidiaryTables",
        objects: [{
            key: "subsidiaryTables",
            name: "subsidiaryTables",
            uri: `${process.env.API_SUBSIDIARY_TABLES}`,
            method: 'GET',
            data: req.query.q
        }]
    };

    let responses = await API.responser(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        render.table = [];
        if (render.hasOwnProperty('subsidiaryTables'))
            render.subsidiaryTables.content.forEach(x => render.table.push({name: x.tableName, uuid: x.table}))
        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

exports.postSubsidiaryTables = (req, res, next) => {
    if ('new' === req.body.action) {
        return res.redirect('/subsidiary-table/new');
    } else {
        return res.redirect('/subsidiary-tables');
    }
};

exports.getSubsidiaryTable = async (req, res) => {
    let uuid = req.params.uuid;

    const render = {
        title: 'Subsidiary Table',
        page: "subsidiaryTable",
        objects: []
    };

    if ('new' === uuid) {
        render.objects.push({
            key: "tables",
            name: "tablesLimited",
            uri: `${process.env.API_TABLE_COLUMN_MODEL_LIMITED}`,
            method: 'GET',
            data: {}
        });
        render.objects.push({
            key: "subsidiaries",
            name: "subsidiariesLimited",
            uri: `${process.env.API_SUBSIDIARY_LIMITED}`,
            method: 'GET',
            data: {}
        });
    } else {
        render.objects.push({
            key: "subsidiaryTable",
            name: "subsidiaryTable",
            uri: `${process.env.API_SUBSIDIARY_TABLES}/${uuid}`,
            method: 'GET',
            data: {}
        });
    }

    let responses = await API.responser(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        render.subsidiaryTable = render.subsidiaryTable || {};
        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

exports.postSubsidiaryTable = async (req, res, next) => {
    let uuid = req.params.uuid,
        body = req.body,
        action = body.action,
        request = [];

    if ('new' === action) {
        return res.redirect('/subsidiary-table/new');
    } else {
        body.columns = body.columns ? JSON.parse(body.columns) : {};
        body.columns = body.columns.filter(c => !c.flag ? c.flag = "0" : c.flag = "1");

        switch (action) {
            case 'save':
                request.push({
                    uri: `${process.env.API_SUBSIDIARY_TABLES}`,
                    method: 'POST',
                    data: {subsidiaryTable: body}
                });
                break;
            case 'update':
                request.push({
                    uri: `${process.env.API_SUBSIDIARY_TABLES}/${uuid}`,
                    method: 'PUT',
                    data: {subsidiaryTable: body}
                });
                break;
            case 'delete':
                request.push({uri: `${process.env.API_SUBSIDIARY_TABLES}/${uuid}`, method: 'DELETE', data: {}});
                break;
            default:
                return res.redirect(req.path);
        }

        let responses = await API.responser(req, res, request);

        if (responses.hasOwnProperty(208)) {
            req.flash('warnings', {msg: 'This record already exist.'});
            return res.redirect('/subsidiary-tables');
        }
        if (responses.hasOwnProperty(200)) {
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect('update' === action ? req.path : '/subsidiary-tables');
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(req.path);
        }

    }
};
