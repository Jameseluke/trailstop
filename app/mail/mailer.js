'use strict';
var Nedb = require('nedb');
const nodemailer = require('nodemailer');
var config = require("./config.json");

module.exports.sendMail = function(messages){
    if(messages.length <= 0){
      console.log('No messages to send');
      return;
    }
    var alertText = "";
    var alertHTML = "<p>";
    messages.forEach(function(message){
       alertText += message + "\n";
       alertHTML += message + "<br />";
    });
    alertHTML += "</p>";
    // create reusable transporter object using the default SMTP transport
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.username,
            pass: config.password
        }
    });

    // setup email data with unicode symbols
    var mailOptions = {
        from: '"Trailing Stock Alerts" <NoReply@trailingstoploss.com>', // sender address
        to: config.emails.join(", "), // list of receivers
        subject: 'New Stock Alerts', // Subject line
        text: alertText, // plain text body
        html: alertHTML // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
}
