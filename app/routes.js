var Todo = require('./models/todo');
var Nedb = require('nedb');
var stocks = new Nedb({ filename: './stocks.db', autoload: true });
stocks.ensureIndex({ fieldName: 'code', unique: true });

function stock(code, name, dayHigh, alertPercentage, alertValue) {
    this.code = code;
    this.name = name;
    this.dayHigh = dayHigh;
    this.alertPercentage = alertPercentage;
    this.alertValue = alertValue;
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
                parseFloat(req.body.alertValue)
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

    // application -------------------------------------------------------------
    app.get('*', function (req, res) {
        res.sendFile(__dirname + '/public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });
};
