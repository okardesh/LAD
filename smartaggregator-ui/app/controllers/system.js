const getSlug = require('speakingurl');
const markdown = require("markdown").markdown;
const API = require('../rest/api');

exports.getTables = async (req, res) => {
    const render = {
        title: 'Data Models',
        page: "tables",
        objects: [
            {
                key: "tables",
                name: "tables",
                uri: `${process.env.API_SYSTEM}/data-models`,
                method: 'GET',
                data: req.query.q
            }
        ]
    };

    let responses = await API.responser(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        for (let i = 0; i < render.tables.length; i++) {
            render.tables[i].url = getSlug(render.tables[i].name, {separator: '_'});
        }

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

exports.getTable = async (req, res) => {
    let uuid = req.params.uuid;

    const render = {
        title: 'Data Model',
        page: "table",
        objects: [
            {
                key: "table",
                name: "tables",
                uri: `${process.env.API_SYSTEM}/data-models`,
                method: 'GET',
                data: {}
            }
        ]
    };

    let responses = await API.responser(req, res, render.objects);

    if (Object.keys(responses[200]).length === render.objects.length) {
        render.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);
        delete render.objects;

        let table = render.table.filter(function (obj) {
            return getSlug(obj.name, {separator: '_'}) === uuid;
        });
        if (table.length > 0)
            render.table = table[0];

        render.info = markdown.toHTML(req.__('info.'.concat(render.page)));
        res.render('pages/'.concat(render.page), render);
    } else {
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};