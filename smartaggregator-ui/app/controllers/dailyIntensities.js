const markdown = require("markdown").markdown;

const API = require('../rest/api');

exports.getDailyIntensities = async (req, res) => {
    req.session.dailyIntensities = null;

    const permissionErrors = [],
        responses = {},
        paths = [];

    paths.push({uri: `${process.env.API_DAILY_INTENSITIES}`, method: 'GET', data: req.query.q});

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
        res.render('pages/dailyIntensities', {
            title: 'Daily Intensities',
            dailyIntensities: responses[`${process.env.API_DAILY_INTENSITIES}`].dailyIntensities,
            info: markdown.toHTML(req.__('info.dailyIntensities'))
        });
    } else {
        return res.redirect('/500');
    }
};