const passport = require('passport');
const markdown = require( "markdown" ).markdown;
const API = require('../rest/api');

exports.getUserAnnouncements = async(req, res) => {
  req.session.announcement = null;

  var announcementsResponse = null;
  var permissionError = [];

  let page = req.query.page;
  let offset = 0;
  let limit =  `${process.env.PAGINATION_LIMIT}`;
  if(page && page > 1){
    offset = limit * (page-1);
  } /*Sonar Bug Fixed else {

    offset = 0;
  }*/
  var data = {
    limit:limit,
    offset:offset,
    sort: {desc: ["lastUpdatedTime"]}
  }

  announcementsResponse = await API.requestAsync(`${process.env.API_ANNOUNCEMENT_USER}`, 'GET', data, req, res);

    if (announcementsResponse && announcementsResponse.statusCode == 200) {
      announcementsResponse = announcementsResponse.appAnnouncements;
    } else if (announcementsResponse && announcementsResponse.statusCode == 403) {
      permissionError.push(`${process.env.API_ANNOUNCEMENT_USER}`)
    } else {
      return res.redirect('/500');
    }

    if(permissionError.length>0){
      res.statusCode = 403;
      req.flash('error', {permissionError:permissionError});
      res.redirect('/403');
    }

  if(permissionError.length==0) {
    res.render('pages/userannouncements', {
      announcements: announcementsResponse,
      info: markdown.toHTML(req.__('info.userannouncements'))
    });
  }

};

exports.getUserAnnouncement = async(req, res) => {
  var announcement = req.session.announcement;
  var uuid = req.params.uuid;
  var permissionError = [];
  var announcementResponse;
  var announcementUser;

  announcementResponse = await API.requestAsync(`${process.env.API_ANNOUNCEMENT}/${uuid}`, 'GET', req.query.q, req, res);

      if (announcementResponse && announcementResponse.statusCode == 200) {

        announcement = announcementResponse.appAnnouncement;
        announcementUser = announcementResponse.appAnnouncementUser;

      }  else if (announcementResponse && announcementResponse.statusCode == 403) {
        permissionError.push(`${process.env.API_ANNOUNCEMENT}`)
      } else {
        return res.redirect('/500');
      }

      if(permissionError.length>0){
        res.statusCode = 403;
        req.flash('error', {permissionError:permissionError});
        res.redirect('/403');
      }

  if(permissionError.length==0) {
    res.render('pages/userannouncement', {
      announcement: announcement,
      announcementUser:announcementUser,
      info: markdown.toHTML(req.__('info.userannouncement'))
    });
  }
};


exports.getAnnouncements = async(req, res) => {
  req.session.announcement = null;
  var permissionError = [];
  var announcementsResponse;

    announcementsResponse = await API.requestAsync(`${process.env.API_ANNOUNCEMENT}`, 'GET', req.query.q, req, res);
   if (announcementsResponse && announcementsResponse.statusCode == 200) {
      announcementsResponse = announcementsResponse.appAnnouncements;
    }  else if (announcementsResponse && announcementsResponse.statusCode == 403) {
      permissionError.push(`${process.env.API_ANNOUNCEMENT}`)
    } else {
      return res.redirect('/500');
    }
    if(permissionError.length>0){
      res.statusCode = 403;
      req.flash('error', {permissionError:permissionError});
      res.redirect('/403');
    }

  if(permissionError.length==0) {
    res.render('pages/announcements', {
      announcements: announcementsResponse,
      info: markdown.toHTML(req.__('info.announcements'))});
  }
};

exports.getAnnouncement = async (req, res) => {
  
  var uuid = req.params.uuid;
  var permissionError = [];
  var announcementResponse = null;
  var subsidiariesResponse = null;

  if ('new' === uuid) {
    subsidiariesResponse = await API.requestAsync(`${process.env.API_SUBSIDIARY_LIMITED}`, 'GET', {}, req, res);

      if (subsidiariesResponse && subsidiariesResponse.statusCode == 200) {
        var announcement = {}
        announcement.subsidiaryUuIds = [];
        subsidiariesResponse = subsidiariesResponse.subsidiariesLimited;
        announcementResponse = announcement;
      }  else if (subsidiariesResponse && subsidiariesResponse.statusCode == 403) {
        permissionError.push(`${process.env.API_SUBSIDIARY_LIMITED}`)
      } else {
        return res.redirect('/500');
      }

      if(permissionError.length>0){
        res.statusCode = 403;
        req.flash('error', {permissionError:permissionError});
        res.redirect('/403');
      }

    if(permissionError.length==0) {
        res.render('pages/announcement', {
          announcement: announcementResponse,
          subsidiaries: subsidiariesResponse,
          info: markdown.toHTML(req.__('info.announcement'))
        });
    }
  } else {

    announcementResponse = await API.requestAsync(`${process.env.API_ANNOUNCEMENT}/${uuid}`, 'GET', {}, req, res);

     if (announcementResponse && announcementResponse.statusCode == 200) {
        announcementResponse = announcementResponse.appAnnouncement;
      }  else if (announcementResponse && announcementResponse.statusCode == 403) {
        permissionError.push(`${process.env.API_ANNOUNCEMENT}`)
      } else {
        return res.redirect('/500');
      }


    subsidiariesResponse = await API.requestAsync(`${process.env.API_SUBSIDIARY_LIMITED}`, 'GET', {}, req, res);
      if (subsidiariesResponse && subsidiariesResponse.statusCode == 200) {
        subsidiariesResponse = subsidiariesResponse.subsidiariesLimited;
      }   else if (subsidiariesResponse && subsidiariesResponse.statusCode == 403) {
        permissionError.push(`${process.env.API_SUBSIDIARY_LIMITED}`)
      } else {
        return res.redirect('/500');
      }

    if(permissionError.length>0){
      res.statusCode = 403;
      req.flash('error', {permissionError:permissionError});
      res.redirect('/403');
    }
    if(permissionError.length==0) {
        res.render('pages/announcement', {
          announcement: announcementResponse,
          subsidiaries: subsidiariesResponse,
          info: markdown.toHTML(req.__('info.announcement'))
        });
    }
  }
};

exports.postAnnouncements = (req, res, next) => {
  var announcement = req.body;
  var action = announcement.action;

  if ('new' === action) {
    return res.redirect('/announcement/new');
  } else {
    return res.redirect('/announcements');
  }
};


exports.postAnnouncement = async(req, res, next) => {
  var uuid = req.params.uuid;
  var announcement = req.body;
  var action = announcement.action;
  var announcementSubsidiary = announcement.subsidiaryUuIds;
  var postAnnouncementResponse = null;
  var permissionError = [];
  if (!Array.isArray(announcementSubsidiary)) {
    announcementSubsidiary = [announcementSubsidiary];
    announcement.subsidiaryUuIds = announcementSubsidiary;
  }

  if(announcement.enablePopup=="on"){
    announcement.enablePopup = 1;
  } else {
    announcement.enablePopup = 0;
  }
  if(announcement.enableAccept=="on"){
    announcement.enableAccept = 1;
  } else {
    announcement.enableAccept = 0;
  }

  if ('new' === action) {
    req.session.announcement = null;
    return res.redirect('/announcement/new');
  } else if ('save' === action) {
    req.session.announcement = announcement;
    postAnnouncementResponse = await API.requestAsync(`${process.env.API_ANNOUNCEMENT}`, 'POST', {announcement: announcement}, req, res);
    if (postAnnouncementResponse && postAnnouncementResponse.statusCode == 200) {
      req.session.announcement = null;
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect('/announcements');
    }
    else if (postAnnouncementResponse && postAnnouncementResponse.statusCode == 403) {
      permissionError.push(`${process.env.API_ANNOUNCEMENT}`)
    } else if (postAnnouncementResponse && postAnnouncementResponse.error) {
      var fields = [];
      var parms=[];
      if(postAnnouncementResponse.announcement.subject==='')
       fields.push("Subject")
      if(postAnnouncementResponse.announcement.message==='')
        fields.push("Message")
      if(postAnnouncementResponse.announcement.subsidiaryUuIds[0] === undefined)
        fields.push("Subsidiaries")
    
      fields.forEach(function(part,index){
        this[index]= req.__(fields[index]);
      },fields);
      parms.push(fields.join(", "));

      req.flash('errors',{msg:"# field(s) can not be left blank.",params:parms});
      return res.redirect('/announcement/new');
    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect('/announcement/new');
    }

  } else if ('update' === action) {
    req.session.announcement = announcement;

    postAnnouncementResponse = await API.requestAsync(`${process.env.API_ANNOUNCEMENT}/${uuid}`, 'PUT', {announcement: announcement}, req, res);


    if (postAnnouncementResponse && postAnnouncementResponse.statusCode == 200) {
      req.session.announcement = null;
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect(`/announcement/${uuid}`);
    }
    else if (postAnnouncementResponse && postAnnouncementResponse.statusCode == 403) {
      permissionError.push(`${process.env.API_ANNOUNCEMENT}`)
    } else if (postAnnouncementResponse && postAnnouncementResponse.error) {
      req.flash('errors', {msg: postAnnouncementResponse.error});
      return res.redirect(`/announcement/${uuid}`);
    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect(`/announcement/${uuid}`);
    }
  } else if ('delete' === action) {
    req.session.announcement = null;
    postAnnouncementResponse = await API.requestAsync(`${process.env.API_ANNOUNCEMENT}/${uuid}`, 'DELETE', {}, req, res);

    if (postAnnouncementResponse && postAnnouncementResponse.statusCode == 200) {
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect('/announcements');
    }
    else if (postAnnouncementResponse && postAnnouncementResponse.statusCode == 403) {
      permissionError.push(`${process.env.API_ANNOUNCEMENT}`)
    } else if (postAnnouncementResponse && postAnnouncementResponse.error) {
      req.flash('errors', {msg: postAnnouncementResponse.error});
      return res.redirect(`/announcement/${uuid}`);
    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect(`/announcement/${uuid}`);
    }

  } else if ('accept' === action) {
    req.session.announcement = null;
    postAnnouncementResponse = await API.requestAsync(`${process.env.API_USER_ACCEPT_ANNOUNCEMENT}/${uuid}`, 'PUT', {}, req, res);

    if (postAnnouncementResponse && postAnnouncementResponse.statusCode == 200) {
      req.flash('success', {msg: 'The operation completed successfully.'});
      return res.redirect('/userAnnouncements');
    }
    else if (postAnnouncementResponse && postAnnouncementResponse.statusCode == 403) {
      permissionError.push(`${process.env.API_USER_ACCEPT_ANNOUNCEMENT}`)
    } else if (postAnnouncementResponse && postAnnouncementResponse.error) {
      req.flash('errors', {msg: postAnnouncementResponse.error});
      return res.redirect(`/userAnnouncement/${uuid}`);
    } else {
      req.flash('errors', {msg: 'An unknown error has occurred. Please contact us.'});
      return res.redirect(`/userAnnouncement/${uuid}`);
    }

  } else {
    return res.redirect(`/announcement/${uuid}`);
  }

  if(permissionError.length>0){
    res.statusCode = 403;
    req.flash('error', {permissionError:permissionError});
    res.redirect('/403');
  }

};

exports.getAnnouncementDetail = async(req, res) => {
  /*Sonar Bug Fixed var announcementdetails = req.session.announcementdetails;*/
  /*Sonar Bug Fixed var announcement = req.session.announcement;*/
  var uuid = req.params.uuid;
  var permissionError = [];
  var announcementDetailsResponse;
  var announcementResponse;

  announcementDetailsResponse = await API.requestAsync(`${process.env.API_ANNOUNCEMENT_DETAIL}/${uuid}`, 'GET', {}, req, res);
  announcementResponse = await API.requestAsync(`${process.env.API_ANNOUNCEMENT}/${uuid}`, 'GET', {}, req, res);

  if (announcementDetailsResponse && announcementResponse && announcementDetailsResponse.statusCode === 200 && announcementResponse.statusCode === 200) {
    announcementDetailsResponse = announcementDetailsResponse.appAnnouncementDetails;
    announcementResponse = announcementResponse.appAnnouncement;
  }  else if (announcementDetailsResponse && announcementDetailsResponse.statusCode == 403) {
    permissionError.push(`${process.env.API_ANNOUNCEMENT_DETAIL}`)
  } else {
    return res.redirect('/500');
  }
  if(permissionError.length>0){
    res.statusCode = 403;
    req.flash('error', {permissionError:permissionError});
    res.redirect('/403');
  }
  if(permissionError.length==0) {
    res.render('pages/announcementdetails', {
      announcementdetails: announcementDetailsResponse,
      announcement: announcementResponse,
      info: markdown.toHTML(req.__('info.announcementdetail'))
    });
  }
};


exports.getUnreadPopup = async(req, res) => {
  var permissionError = [];
  var unreadPopupAnnouncementResponse;

  unreadPopupAnnouncementResponse = await API.requestAsync(`${process.env.API_UNREAD_POPUP_ANNOUNCEMENT}`, 'GET', {}, req, res);

  if (unreadPopupAnnouncementResponse && unreadPopupAnnouncementResponse.statusCode == 200) {

    unreadPopupAnnouncementResponse = unreadPopupAnnouncementResponse.appPopupAnnouncements;

  }  else if (unreadPopupAnnouncementResponse && unreadPopupAnnouncementResponse.statusCode == 403) {
    permissionError.push(`${process.env.API_UNREAD_POPUP_ANNOUNCEMENT}`)
  } else {
    return res.redirect('/500');
  }

  if(permissionError.length>0){
    res.statusCode = 403;
    req.flash('error', {permissionError:permissionError});
    res.redirect('/403');
  }

  if(permissionError.length==0) {
    return res.json({unreadPopupAnnouncements: unreadPopupAnnouncementResponse});
  }
};

exports.unreadAnouncement = async(req,res) =>{
  var unreadAnnouncementResponse;
  var permissionError = [];

  unreadAnnouncementResponse = await API.requestAsync(`${process.env.API_USER_UNREAD_ANNOUNCEMENT}`, 'GET', {}, req, res);
  if (unreadAnnouncementResponse && unreadAnnouncementResponse.statusCode == 200) {

    unreadAnnouncementResponse = unreadAnnouncementResponse.user.unreadAnnouncement;

  }  else if (unreadAnnouncementResponse && unreadAnnouncementResponse.statusCode == 403) {
    permissionError.push(`${process.env.API_USER_UNREAD_ANNOUNCEMENT}`)
  } else {
    return res.redirect('/500');
  }

  if(permissionError.length>0){
    res.statusCode = 403;
    req.flash('error', {permissionError:permissionError});
    res.redirect('/403');
  }

  if(permissionError.length==0) {
    return res.json({unreadAnnouncement:unreadAnnouncementResponse});
  }

}
