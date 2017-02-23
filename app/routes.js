var Nedb = require('nedb');
var request = require('request');
var stocks = new Nedb({ filename: './stocks.db', autoload: true });
stocks.ensureIndex({ fieldName: 'code', unique: true });
stocks.persistence.setAutocompactionInterval(5000);

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
            res.send(err);
        }

        res.json(docs); 
      });
};

module.exports = function (app) {

    // api ---------------------------------------------------------------------
    // get all todos
    app.get('/api/stocks', function (req, res) {
        getStocks(res);
    });

    // create todo and send back all todos after creation
    app.post('/api/stocks', function (req, res) {
        var tempStock = new stock(
                req.body.code,
                req.body.name,
                parseFloat(req.body.dayHigh),
                parseInt(req.body.alertPercentage),
                parseFloat(req.body.alertValue),
                req.body.currency
            )
        // create a todo, information comes from AJAX request from Angular
        stocks.insert(tempStock, function (err) {
            if (err){
                res.send(err);
            } else {
                getStocks(res);
            }
            // get and return all the todos after you create another

        });
    });

    app.delete('/api/stocks/:stock_id', function (req, res) {
        stocks.remove({ _id: req.params.stock_id}, {}, function (err, numRemoved) {
            // numRemoved = 1
            if (err) {
                res.send(err);
            }
            stocks.find({}, function (err, docs) {
                if (err) {
                    res.send(err);
                }
                res.json(docs); 
              });
        });
    });
    
    app.post('/api/stocks/:stock_id', function (req, res){
        var newAlertPercentage = parseInt(req.body.alertPercentage);
        var newAlertValue = parseFloat(req.body.alertValue);
        stocks.update({ _id: req.params.stock_id }, { $set: { alertValue: newAlertValue, alertPercentage: newAlertPercentage}}, {}, function () {
            stocks.find({ _id: req.params.stock_id}, function(err, docs) {
                if (err) {
                    res.send(err);
                }
                res.json(docs);
            })
        });
    });
    
    app.get('/api/stocks/update', function(req, res){
        var oldStocks = {};
        var alerts = [];
        var updates = []
        // for each stock in database
        stocks.find({}, function (err, docs) {
            if (err) {
                res.send(err);
            }
            if(docs.length == 0){
                res.send('nothing here');
            }
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
            request({
                url: url
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    var data = JSON.parse(body).query;
                    data = (data.count == 1) ? [data.results.quote] : data.results.quote;
                    data.forEach(function(datum){
                        console.log(oldStocks[datum.Symbol].alertValue);
                        console.log(datum.DaysHigh * ((100-oldStocks[datum.Symbol].alertPercentage)/100));
                        if (oldStocks[datum.Symbol].alertValue < (datum.DaysHigh * (100-oldStocks[datum.Symbol].alertPercentage)/100).toFixed(2)) {
                            var newAlertValue = (datum.DaysHigh * ((100-oldStocks[datum.Symbol].alertPercentage)/100)).toFixed(2);
                            stocks.update({ _id: oldStocks[datum.Symbol].id }, { $set: { alertValue: newAlertValue}}, {}, function () {
                                
                            });
                            updates.push({"code": datum.Symbol, "value": newAlertValue});
                        }
                        if (oldStocks[datum.Symbol].alertValue > datum.LastTradePriceOnly){
                            // Alarm bells
                            alerts.push({"code": datum.Symbol, "price": datum.LastTradePriceOnly, "alert": oldStocks[datum.Symbol].alertValue})
                        }
                    });
                    // Send out alerts by email
                    res.send({"updates": updates, "alerts": alerts});                }
                else {
                    res.send(error);
                }
            })
        });
        //make api call, for each code
        // compare alert price to lasttradeprice
        // if highprice - alertpercentage > alert price, change alert price
        // if lasttradepriceonly < alert price, send alert
    });

    // application -------------------------------------------------------------
    app.get('*', function (req, res) {
        res.sendFile(__dirname + '/public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });
};
