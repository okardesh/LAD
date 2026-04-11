const markdown = require("markdown").markdown;
const API = require('../rest/api');

exports.getTableColumnModels = async (req, res) => {
    const render = {
        title: 'Table Column Models',
        page: "tableColumnModels",
        objects: [
            {
                key: "tables",
                name: "tables",
                uri: `${process.env.API_TABLE_COLUMN_MODEL}`,
                method: 'GET',
                data: req.query.q
            }
        ]
    };

    await API.renderer(req, res, render);
};

exports.getTableColumnModel = async (req, res) => {
    let uuid = req.params.uuid;

    const render = {
        title: 'Table Column Model',
        page: "tableColumnModel",
        objects: [{
            key: 'table',
            name: 'table',
            uri: `${process.env.API_TABLE_COLUMN_MODEL}/${uuid}`,
            method: 'GET',
            data: {}
        }]
    };

    let responses = await API.responser(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

exports.postTableColumnModel = async (req, res) => {
    let uuid = req.params.uuid,
        body = req.body,
        action = body.action;

    if (action !== 'update') {
        req.flash('warnings', {msg: 'Action selection was not made or could not be done correctly. Please try again.'});
        return res.redirect(req.path);
    }

    body.columns = body.columns ? JSON.parse(body.columns) : {};

    let responses = await API.responser(req, res, [{uri: `${process.env.API_TABLE_COLUMN_MODEL}/${uuid}`, method: 'PUT', data: {table: body}}]);

    if (responses.hasOwnProperty(200)) {
        req.flash('success', {msg: 'The operation completed successfully.'});
        return res.redirect('update' === action ? req.path : '/table-column-models');
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }

};
