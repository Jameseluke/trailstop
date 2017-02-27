'use strict';
const nodemailer = require('nodemailer');


module.exports.sendMail = function(emails, alerts){
    var alertText = "";
    var alertHTML = "<p>";
    alerts.forEach(function(alert){
       alertText += alert + "\n";
       alertHTML += alert + "<br />";
    });
    alertHTML += "</p>";
    console.log(alertHTML);
    // create reusable transporter object using the default SMTP transport
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'ath3rion@gmail.com',
            pass: '#JEL2015'
        }
    });
    
    // setup email data with unicode symbols
    var mailOptions = {
        from: '"Trailing Stock Alerts" <NoReply@trailingstoploss.com>', // sender address
        to: emails.join(", "), // list of receivers
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
