var Nedb = require('nedb');
var request = require('request');
var stocks = new Nedb({ filename: './stocks.db', autoload: true });
stocks.ensureIndex({ fieldName: 'code', unique: true });
stocks.persistence.setAutocompactionInterval(5000);
var mailer = require("./mail/mailer");

function stock(code, name, dayHigh, alertPercentage, alertValue, currency) {
    this.code = code;
    this.name = name;
    this.dayHigh = dayHigh;
    this.alertPercentage = alertPercentage;
    this.alertValue = alertValue;
    this.currency = currency;
    this.dateCreated = (new Date()).getTime();
}


function getStocks(res) {
    stocks.find({}, function (err, docs) {
        if (err) {
            res.status(500);
            res.send(err.message);
        }
        else {
            res.json(docs);
        }
      });
};

function sendEmails(message){

}



module.exports = function (app) {
    app.get('/api/stocks', function (req, res) {
        getStocks(res);
    });

    app.post('/api/stocks', function (req, res) {
        var tempStock = new stock(
                req.body.code,
                req.body.name,
                parseFloat(req.body.dayHigh),
                parseInt(req.body.alertPercentage),
                parseFloat(req.body.alertValue),
                req.body.currency
            )
        stocks.insert(tempStock, function (err) {
            if (err){
                res.status(500);
                res.send(err.message);
            } else {
                getStocks(res);
            }
        });
    });

    app.delete('/api/stocks/:stock_id', function (req, res) {
        stocks.remove({ _id: req.params.stock_id}, {}, function (err, numRemoved) {
            // numRemoved = 1
            if (err) {
                res.status(500);
                res.send(err.message);
            }
            else {
                getStocks(res);
            }
        });
    });

    app.post('/api/stocks/:stock_id', function (req, res){
        var newAlertPercentage = parseInt(req.body.alertPercentage);
        var newAlertValue = parseFloat(req.body.alertValue);
        stocks.update({ _id: req.params.stock_id }, { $set: { alertValue: newAlertValue, alertPercentage: newAlertPercentage}}, {}, function () {
            stocks.find({ _id: req.params.stock_id}, function(err, docs) {
                if (err) {
                    res.status(500);
                    res.send(err.message);
                }
                else {
                    res.json(docs);
                }
            })
        });
    });

    app.get('/api/stocks/update', function(req, res){
        var oldStocks = {};
        var alerts = [];
        var updates = []
        stocks.find({}, function (err, docs) {
            if (err) {
                res.status(500);
                res.send(err.message);
            }
            else {
              if(docs.length == 0){
                    res.status(500);
                    res.send('No stocks currently being tracked');
                }
                else {
                    docs.forEach(function(doc){
                        oldStocks[doc.code] = {
                            "alertValue": doc.alertValue,
                            "id": doc._id,
                            "alertPercentage": doc.alertPercentage
                        };
                    });
                    var codes = Object.keys(oldStocks);
                    var symbols = '"' + codes.join('","') + '"';
        		    var base = "https://query.yahooapis.com/v1/public/yql?q=";
        		    var query = "select Symbol, DaysHigh, LastTradePriceOnly from yahoo.finance.quotes where symbol in (" + symbols + ")";
        		    var format = "&format=json&diagnostics=false";
        		    var env = "&env=store://datatables.org/alltableswithkeys";
        		    var url = base + query + format + env;
                    request({url: url}, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            var data = JSON.parse(body).query;
                            data = (data.count == 1) ? [data.results.quote] : data.results.quote;
                            data.forEach(function(datum){
                                stocks.update({ _id: oldStocks[datum.Symbol].id }, { $set: { dayHigh: datum.DaysHigh}}, {}, function () {
                                    });
                                if (oldStocks[datum.Symbol].alertValue < (datum.DaysHigh * (100-oldStocks[datum.Symbol].alertPercentage)/100).toFixed(2)) {
                                    var newAlertValue = (datum.DaysHigh * ((100-oldStocks[datum.Symbol].alertPercentage)/100)).toFixed(2);
                                    stocks.update({ _id: oldStocks[datum.Symbol].id }, { $set: { alertValue: newAlertValue}}, {}, function () {
                                    });
                                    updates.push({"code": datum.Symbol, "value": newAlertValue});
                                }
                                if (oldStocks[datum.Symbol].alertValue > datum.LastTradePriceOnly){
                                    // Alarm bells
                                    alerts.push(datum.Symbol + " is $" + datum.LastTradePriceOnly + ". This is below the trailing alert price of $"+ oldStocks[datum.Symbol].alertValue.toFixed(2));
                                }
                            });
                            // Send out alerts by email here
                            //var emails = ["JELuke@hotmail.com.au"];
                            mailer.sendMail(alerts);
                            res.send({"updates": updates, "alerts": alerts});
                        }
                        else {
                            res.status(500);
                            res.send(err.message);
                        }
                    });
                }
            }
        });
    });

    // application -------------------------------------------------------------
    app.get('*', function (req, res) {
        res.sendFile(__dirname + '/public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });
};
