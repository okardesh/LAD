const API = require('../rest/api');

exports.getSettings = async (req, res) => {
    

      res.render('pages/settings', {
        title: 'Settings',

      });
   
       

   };