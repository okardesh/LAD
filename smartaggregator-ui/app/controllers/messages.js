const passport = require('passport');
const markdown = require( "markdown" ).markdown;

const API = require('../rest/api');

exports.getMessages = async (req, res) => {
    req.session._messages_ = null;
    var permissionError = [];
    var messagesResponse = null;

    messagesResponse = await API.requestAsync(`${process.env.API_MESSAGES}`, 'GET', req.query.q, req, res);
    if (messagesResponse && messagesResponse.statusCode == 200) {
        messagesResponse = messagesResponse.messages;
    } else if (messagesResponse && messagesResponse.statusCode == 403) {
        permissionError.push(`${process.env.API_MESSAGES}`)
    } else {
        return res.redirect('/500');
    }

    if(permissionError.length>0){
        res.statusCode = 403;
        req.flash('error', {permissionError:permissionError});
        res.redirect('/403');
    }

    if(permissionError.length==0) {
        res.render('pages/messages', {
            title: 'Message',
            __messages: messagesResponse,
            info: markdown.toHTML(req.__('info.messages'))});
    }
};

exports.postMessages= (req, res, next) => {
    req.session._messages_ = null;
    /*Sonar Bug Fixed var me = req.user;*/
    var message = req.body;
    var action = message.action;

    if ('new' === action) {
        return res.redirect('/message/new');
    } else {
        return res.redirect('/messages');
    }
};

exports.getMessage = async (req, res) => {
    var _messages_ = req.session._messages_;
    var uuid = req.params.uuid;
    var permissionError = [];
    var messageResponse = null;

    if (_messages_) {
        res.render('pages/message', {title: 'Message', __message: _messages_, info: markdown.toHTML(req.__('info.message'))});
    } else {
        if ('new' === uuid) {
            res.render('pages/message', {title: 'Message', __message: {}, info: markdown.toHTML(req.__('info.message'))});
        } else {

            messageResponse = await API.requestAsync(`${process.env.API_MESSAGES}/${uuid}`, 'GET', {}, req, res);
            if (messageResponse && messageResponse.statusCode == 200) {
                messageResponse = messageResponse.message;
            } else if (messageResponse && messageResponse.statusCode == 403) {
                permissionError.push(`${process.env.API_MESSAGES}`)
            } else {
                return res.redirect('/500');
            }

            if(permissionError.length>0){
                res.statusCode = 403;
                req.flash('error', {permissionError:permissionError});
                res.redirect('/403');
            }

            if(permissionError.length==0) {
                res.render('pages/message', {title: 'Message',
                    __message: messageResponse,
                    info: markdown.toHTML(req.__('info.message'))});

            }
        }
    }
};

exports.postMessage = async (req, res, next) => {
    var uuid = req.params.uuid;
    let message = req.body;
    var action = message.action;
    var permissionError = [];
    var postMessageResponse = null;


    if ('new' === action) {
        req.session._messages_ = null;
        return res.redirect('/message/new');
    } else if ('save' === action) {
        req.session._messages_ = message;

        message.status = message.status === 'on' ? 1 : 2;
        postMessageResponse =  await API.requestAsync(`${process.env.API_MESSAGES}`, 'POST', {message: message}, req, res);

        if (postMessageResponse && postMessageResponse.statusCode == 200) {
            req.session._messages_ = null;
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect('/messages');
        }
        else if (postMessageResponse && postMessageResponse.statusCode == 403) {
            permissionError.push(`${process.env.API_MESSAGES}`)
        } else if (postMessageResponse && postMessageResponse.error) {
            req.flash('errors', {msg: postMessageResponse.error});
            return res.redirect('/message/new');
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect('/message/new');
        }

    } else if ('update' === action) {
        req.session._messages_ = message;
        message.status = message.status === 'on' ? 1 : 2;
        postMessageResponse = await API.requestAsync(`${process.env.API_MESSAGES}/${uuid}`, 'PUT', {message: message}, req, res)

            if (postMessageResponse && postMessageResponse.statusCode == 200) {
                req.session._messages_ = null;
                req.flash('success', {msg: 'The operation completed successfully.'});
                return res.redirect(`/message/${uuid}`);
            }
            else if (postMessageResponse && postMessageResponse.statusCode == 403) {
                permissionError.push(`${process.env.API_MESSAGES}`)
            } else if (postMessageResponse && postMessageResponse.error) {
                req.flash('errors', {msg: postMessageResponse.error});
                return res.redirect(`/message/${uuid}`);
            } else {
                req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
                return res.redirect(`/message/${uuid}`);
            }


    } else if ('delete' === action) {
        req.session._messages_ = null;
        postMessageResponse = await API.requestAsync(`${process.env.API_MESSAGES}/${uuid}`, 'DELETE', {}, req, res);
        if (postMessageResponse && postMessageResponse.statusCode == 200) {
            req.flash('success', {msg: 'The operation completed successfully.'});
            return res.redirect('/messages');
        }
        else if (postMessageResponse && postMessageResponse.statusCode == 403) {
            permissionError.push(`${process.env.API_MESSAGES}`)
        } else if (postMessageResponse && postMessageResponse.error) {
            req.flash('errors', {msg: postMessageResponse.error});
            return res.redirect(`/message/${uuid}`);
        } else {
            req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
            return res.redirect(`/message/${uuid}`);
        }
    } else {
        return res.redirect(`/message/${uuid}`);
    }

    if(permissionError.length>0){
        res.statusCode = 403;
        req.flash('error', {permissionError:permissionError});
        res.redirect('/403');
    }

};