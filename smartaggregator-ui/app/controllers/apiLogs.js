const API = require('../rest/api');

exports.getApiLogs = async (req, res) => {
    const render = {
        title: 'ApiLogs',
        page: "apiLogs",
        objects: [
            {
                key: "apiLogs",
                name: "apiLogs",
                uri: `${process.env.API_API_LOGS}`,
                method: 'GET',
                data: req.query.q
            }
        ]
    };

    await API.renderer(req, res, render);
};

exports.getApiLog = async (req, res) => {
    let uuid = req.params.uuid;

    const render = {
        title: 'ApiLogs',
        page: "apiLog",
        objects: [
            {
                key: "apiLog",
                name: "apiLog",
                uri: `${process.env.API_API_LOGS}/${uuid}`,
                method: 'GET',
                data: {}
            }
        ]
    };

    await API.renderer(req, res, render);
};

exports.getErrorLogs = async (req, res) => {
    const render = {
        title: 'ErrorLogs',
        page: "errorLogs",
        objects: [
            {
                key: "errorLogs",
                name: "apiLogs",
                uri: `${process.env.API_API_LOGS}/error-logs`,
                method: 'GET',
                data: req.query.q
            }
        ]
    };

    await API.renderer(req, res, render);
};

exports.getErrorLog = async (req, res) => {
    let uuid = req.params.uuid;

    const render = {
        title: 'Error Log',
        page: "errorLog",
        objects: [
            {
                key: "errorLogs",
                name: "apiLog",
                uri: `${process.env.API_API_LOGS}/${uuid}`,
                method: 'GET',
                data: {}
            }
        ]
    };

    await API.renderer(req, res, render);
};