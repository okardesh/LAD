const request = require('request');
const requestPromise = require('request-promise');
const jwt = require('jsonwebtoken');
const markdown = require("markdown").markdown;

const SECRET = "123!@#$%^PLM-123!@#$%^PLM";
const TOKEN_PREFIX = "Bearer ";
const AUTHORITIES = "Authorities";
const USERUUID = "User-Uuid";
const USER_DETAILS = "UserDetails";
const SIDE_MENU_PERMISSION = "sideMenuPermission";
const ORGANIZATION = "organization";

exports.login = (username, password, req, cb) => {
    let data = {
        username: username,
        password: password,
    };

    let options = {
        url: `${process.env.API_URL}/login`,
        method: 'POST',
        json: data,
        headers: {
            'User-Agent': req.headers['user-agent'],
            'X-Forwarded-For': req.ip,
            'Accept-Language': req.language !== undefined ? req.language : 'en'
        }
    };

    console.info("********** CALL API **********");
    console.info(`/POST /login`);



    request(options, function (error, response) {
        if (error) console.error('response error-->', error);
        console.info('response status-->', response && response.statusCode ? response.statusCode : 'XXX');
        console.info("********** END API  **********");

        if (response && response.statusCode === 200 && response.headers && response.headers.authorization) {
            let authorization = response.headers.authorization;
            let token = authorization.replace(TOKEN_PREFIX, '');

            // Bypassing verification for local development
            let claims = jwt.decode(token);
            if (claims) {
                return cb({
                    uuid: claims[USERUUID],
                    username: username,
                    roles: claims[AUTHORITIES].split(','),
                    authorization: authorization,
                    userDetails: claims[USER_DETAILS],
                    sideMenuPermission: claims[SIDE_MENU_PERMISSION],
                    organization: claims[ORGANIZATION]
                });
            } else {
                return cb(null);
            }
        } else {
            return cb(null);
        }
    });
};

exports.logged = (req, cb) => {
    let options = {
        url: `${process.env.API_URL}${process.env.API_LOGIN}`,
        method: 'POST',
        headers: {
            Authorization: req.user.authorization,
            'User-Agent': req.headers['user-agent'],
            'X-Forwarded-For': req.ip
        }
    };

    console.info("********** CALL API **********");
    console.info(`/POST ${process.env.API_LOGIN}`);

    request(options, function (error, response) {
        if (error) console.error('response error-->', error);
        console.info('response status-->', response && response.statusCode ? response.statusCode : 'XXX');
        console.info("********** END API  **********");

        if (response && response.statusCode === 200) {
            return cb(true);
        } else {
            return cb(false);
        }
    });
};

exports.logout = (req, cb) => {
    let options = {
        url: `${process.env.API_URL}${process.env.API_LOGOUT}`,
        method: 'POST',
        timeout: 5000,
        headers: {
            Authorization: req.user.authorization,
            'User-Agent': req.headers['user-agent'],
            'X-Forwarded-For': req.ip
        }
    };

    console.info("********** CALL API **********");
    console.info(`/POST ${process.env.API_LOGOUT}`);

    request(options, function (error, response) {
        if (error) console.error('response error-->', error);
        console.info('response status-->', response && response.statusCode ? response.statusCode : 'XXX');
        console.info("********** END API  **********");

        if (response && response.statusCode === 200) {
            return cb(true);
        } else {
            return cb(false);
        }
    });
};

exports.requestAsync = async (uri, method, data, req) => {
    console.info("********** CALL ASYNC API **********");
    console.info(`/${method} ${uri}`);

    let options = {
        url: `${process.env.API_URL}${uri}`,
        method: `${method}`,
        json: data,
        headers: {
            Authorization: req.user.authorization,
            'User-Agent': req.headers['user-agent'],
            'X-Forwarded-For': req.ip,
            'Accept-Language': req.language !== undefined ? req.language : 'en',
            'Accept': 'application/json'
        },
        resolveWithFullResponse: true
    };

    let resolve = function (response) {

        if (response.body) {
            //data = response.body;
            if (!response.body.hasOwnProperty("error"))
                data = JSON.parse(JSON.stringify(response.body).replace(/'/g, "`"))
            else
                data = response.body;
        }
        if (response.statusCode) {
            data.statusCode = response.statusCode;
        }
        if (response.error) {
            data.error = response.error.error;
            console.error('response error-->', data.error);
        }

        console.info('response status-->', response && response.statusCode ? response.statusCode : 'XXX');
        console.info("********** END ASYNC API **********");

        return data;
    };

    return await requestPromise(options).then(resolve).catch(resolve);
};

//BU KOD KALDIRILACAKTIR
exports.request = (uri, method, data, req, res, cb) => {
    console.info("********** CALL API **********");
    console.info(`/${method} ${uri}`);

    let options = {
        url: `${process.env.API_URL}${uri}`,
        method: `${method}`,
        json: data,
        headers: {
            Authorization: req.user.authorization,
            'User-Agent': req.headers['user-agent'],
            'X-Forwarded-For': req.ip,
            'Accept-Language': req.language !== undefined ? req.language : 'en'
        }
    };

    request(options, function (error, response, data1) {
        if (error) console.error('response error-->', error);
        data1 = data1 || {};

        let resolve = function (response1) {
            if (response1.body) {
                data1 = response1.body;
            }
            if (response1.statusCode) {
                data1.statusCode = response1.statusCode;
            }
            if (response1.error) {
                data1.error = response1.error.error;
                console.error('response error-->', data1.error);
            }

            console.info('response status-->', response1 && response1.statusCode ? response1.statusCode : 'XXX');
            console.info("********** END API **********");

            return data1;
        };

        return cb(resolve(response));
    });
};

/**
 * This method render a page after the responses has been processed.
 * @param req
 * @param res
 * @param renderer
 * @returns {Promise<void>}
 */
exports.renderer = async (req, res, renderer) => {
    //get API responses status by status
    const responses = await sendRequest(req, res, renderer.objects);

    //handle responses
    await responseHandler(req, res, responses);

    if (Object.keys(responses[200]).length === renderer.objects.length) {
        //if everything ok create render object with title and info
        const render = {
            title: renderer.page,
            info: markdown.toHTML(req.__('info.'.concat(renderer.page)))
        };

        //set other specific objects to render
        renderer.objects.forEach(object => render[object.key] = responses[200][object.uri][object.name]);

        //render page
        res.render('pages/'.concat(renderer.page), render);
    } else {
        //Has any exception
        req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
        return res.redirect(req.path);
    }
};

/**
 * This method returns responses with a status code of 200 after the responses has been processed.
 * @param req
 * @param res
 * @param paths
 * @returns {*}
 */
exports.responser = async (req, res, paths) => {
    let responses = await sendRequest(req, res, paths);

    //handle responses
    await responseHandler(req, res, responses);

    //return response if everything ok
    return responses;
};

exports.ajax = async (req, res, paths) => {
    let responses = await sendRequest(req, res, paths);

    await responseHandler(req, res, responses, true);

    return responses;
};

/**
 * This method send request to API and return responses by status code
 * @param req
 * @param res
 * @param paths This param must be an array and every object must contains uri, method and data
 * @returns {Promise<{}>}
 */
let sendRequest = async (req, res, paths) => {
    const responses = {};

    for (const path of paths) {
        //send request to API
        let data = await this.requestAsync(path.uri, path.method, path.data, req) || {};

        //if data does not contain status code status code is set to 500
        data.statusCode = data.statusCode || 500;

        if (data.error && data.statusCode === 200) {
            responses.error = data.error;
            break;
        }

        if (!responses.hasOwnProperty(data.statusCode)) responses[data.statusCode] = {};

        //collect API response by status code
        if (data.statusCode === 500) {
            //returned error
            responses[data.statusCode][path.uri] = data.error;
        } else if (data.statusCode === 400) {
            //returned 400
            responses[data.statusCode][path.uri] = data.error;
        } else if (data.statusCode === 401) {
            //returned 401
        } else if (data.statusCode === 403) {
            //returned 403
            responses[data.statusCode][path.uri] = data.error;
        } else if (data.statusCode === 404) {
            //returned 404
        } else {
            //returned others
            responses[data.statusCode][path.uri] = data;
        }
    }

    return responses;
};

/**
 * This method handle response by status code
 * @param req
 * @param res
 * @param responses
 * @param json
 * @returns {void|*|Response}
 */
let responseHandler = async (req, res, responses, json = false) => {
    if (responses.hasOwnProperty('error')) {
        req.flash('errors', {msg: responses.error});
        !json ? res.redirect(req.path) : res.json(responses.error);
    } else if (responses.hasOwnProperty(500) && Object.keys(responses[500]).length > 0) {
        //error response
        !json ? res.redirect('/500') : res.json(responses[500]);
    } else if (responses.hasOwnProperty(400) && Object.keys(responses[400]).length > 0) {
        //400 response
        !json ? res.redirect('/400') : res.json(responses[400]);
    } else if (responses.hasOwnProperty(401) && Object.keys(responses[401]).length > 0) {
        //401 response
        !json ? res.redirect('/401') : res.json(responses[401]);
    } else if (responses.hasOwnProperty(403) && Object.keys(responses[403]).length > 0) {
        //403 response
        !json ? res.redirect('/403') : res.json(responses[403]);
    } else if (responses.hasOwnProperty(404) && Object.keys(responses[404]).length > 0) {
        //404 response
        !json ? res.redirect('/404') : res.json(responses[404]);
    }
};
