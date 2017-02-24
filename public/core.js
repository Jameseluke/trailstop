var scotchTodo = angular.module('scotchTodo', []);

function mainController($scope, $http) {
	$scope.newStocks = {};
	$scope.alerts = [];
	$scope.updates = [];
	$scope.codes = [];
	$scope.updating = false;
	$scope.sortType     = 'dateCreated'; // set the default sort type
	$scope.sortReverse  = true;  // set the default sort order
	$scope.searchStocks   = '';     // set the default search/filter term
	
	// when landing on the page, get all todos and show them
	$http.get('/api/stocks')
		.success(function(data) {
			data.forEach(function(datum){
				datum["editing"] = false;
				datum["deleting"] = false;
			});
			console.log(data);
			$scope.stocks = data;
		})
		.error(function(data) {
			$scope.alerts.push('Error: ' + data);
		});
	
	$scope.changeAlert = function(key){
		$scope.newStocks[key].alertValue = (parseFloat($scope.newStocks[key].dayHigh) * (100-parseInt($scope.newStocks[key].alertPercentage))/100).toFixed(2);
	}
	
	$scope.changeTempAlert = function(stock){
		stock.tempValue = (parseFloat(stock.dayHigh) * (100-parseInt(stock.tempPercentage))/100).toFixed(2);
	}
	
	$scope.deleteNewStock = function(key){
		delete $scope.newStocks[key];
	}

	$scope.fetchStockData = function($event){;
    	if($event.which === 13) {
    		//$scope.newStocks = {};
    		if($scope.codes.length <= 1){
    			var symbols = '"' + $scope.codes + '"';
    		} else {
    			var symbols = '"' + $scope.codes.join('","') + '"';
    		}
    		var base = "https://query.yahooapis.com/v1/public/yql?q=";
    		var query = "select Symbol, DaysHigh, Name, Currency from yahoo.finance.quotes where symbol in (" + symbols + ")";
    		var format = "&format=json&diagnostics=false";
    		var env = "&env=store://datatables.org/alltableswithkeys";
    		var url = base + query + format + env;
    		 $http.get(url)
			    .then(function(response) {
			    	if (!response.data.query.count){
			    		// No results found
			    		$scope.alerts.push('Error: Please Enter One or More Codes in the Format XYZ, XYZ, XYZ');
			    	}
			    	else if (response.data.query.count == 1){
			    		var quote = response.data.query.results.quote;
			    		if(quote.Name){
			    			// No match on symbol
			    			$scope.newStocks[quote.Symbol.toUpperCase()] = {
			    				"dayHigh": quote.DaysHigh,
			    				"name": quote.Name,
			    				"alertPercentage": 20,
			    				"alertValue": (parseFloat(quote.DaysHigh) * 0.80).toFixed(2),
			    				"currency": quote.Currency
			    			}
			    		}
			    		else {
			    			$scope.alerts.push('No company found for code ' + quote.Symbol.toUpperCase() + ".");
			    		}
			    		
			    	}
			    	else {
			    		response.data.query.results.quote.forEach(function(quote){
			    			if(quote.Name){
				    			$scope.newStocks[quote.Symbol.toUpperCase()] = {
				    				"dayHigh": quote.DaysHigh,
				    				"name": quote.Name,
				    				"alertPercentage": 20,
				    				"alertValue": (parseFloat(quote.DaysHigh) * 0.80).toFixed(2),
				    				"currency": quote.Currency
				    			}
			    			} 
			    			else {
			    				$scope.alerts.push('No company found for code ' + quote.Symbol.toUpperCase() + ".");
			    			}
			    			
			    		});
			    	}
			    });
            event.preventDefault();
        }
	}
	
	$scope.range = (function() {
		var cache = {};
		return function(min, max, step) {
			var isCacheUseful = (max - min) > 70;
			var cacheKey;
	
			if (isCacheUseful) {
				cacheKey = max + ',' + min + ',' + step;
	
				if (cache[cacheKey]) {
					return cache[cacheKey];
				}
			}
	
			var _range = [];
			step = step || 1;
			for (var i = min; i <= max; i += step) {
				_range.push(i);
			}
	
			if (isCacheUseful) {
				cache[cacheKey] = _range;
			}
	
			return _range;
		};
	})();
	
	$scope.isEmptyObject = function(obj) {
    	return angular.equals({}, obj);
	};
	
	$scope.createStock = function(key) {
		var postData = {
			"code": key,
			"name": $scope.newStocks[key].name,
			"dayHigh": $scope.newStocks[key].dayHigh,
			"alertPercentage": $scope.newStocks[key].alertPercentage,
			"alertValue": $scope.newStocks[key].alertValue,
			"currency": $scope.newStocks[key].currency
		}
		delete $scope.newStocks[key];
		$http.post('/api/stocks', postData)
			.success(function(data) {
				delete $scope.codes[key];
				// clear the form so our user is ready to enter another
				$scope.stocks = data;
			})
			.error(function(data) {
				$scope.alerts.push('Error: ' + data);
			});
	};

	$scope.deleteStock = function(id) {
		$http.delete('/api/stocks/' + id)
			.success(function(data) {
				data.forEach(function(datum){
					datum["editing"] = false;
					datum["deleting"] = false;
				});
				$scope.stocks = data;
			})
			.error(function(data) {
				$scope.alerts.push('Error: ' + data);
			});
	};
	
	$scope.check = function(value) {
		if($scope.sortType != value){
			$scope.sortType = value;
			$scope.sortReverse = false;
			return;
		}
		if($scope.sortType == value && !$scope.sortReverse){
			$scope.sortReverse = !$scope.sortReverse;
			return;
		}
		else {
			$scope.sortReverse = true;
			$scope.sortType = 'dateCreated';
			return;
		}
	}
	
	$scope.startEditing = function(stock){
		console.log(stock);
		stock.editing = true;
		stock.tempPercentage = stock.alertPercentage;
		stock.tempValue = stock.alertValue;
	}
	
	$scope.stopEditing = function(commit, stock){
		var postData = {
			"alertValue" : stock.tempValue,
			"alertPercentage" : stock.tempPercentage
		}
		if(commit){
			$http.post('/api/stocks/' + stock._id, postData)
			.success(function(data){
				stock.alertPercentage = data[0].alertPercentage;
				stock.alertValue = data[0].alertValue;
				stock.editing = false;
			})
			.error(function(data) {
				$scope.alerts.push('Error: ' + data);
			});
		}
		else {
			stock.editing = false;
		}
	}
	
	$scope.startDeleting = function(stock){
		console.log(stock);
		stock.deleting = true;
	}
	
	$scope.stopDeleting = function(commit, stock){
		stock.deleting = false;
		if(commit){
			$scope.deleteStock(stock._id);
		}
	}
	
	$scope.update = function() {
		$scope.updating = true;
		$http.get('/api/stocks/update')
			.success(function(data){
				$scope.updates = data.updates;
				$scope.alerts = data.alerts;
				$http.get('/api/stocks')
					.success(function(data) {
						data.forEach(function(datum){
							datum["editing"] = false;
							datum["deleting"] = false;
						});
						console.log(data);
						$scope.stocks = data;
					})
					.error(function(data) {
						$scope.alerts.push('Error: ' + data);
					});
			})
			.error(function(data) {
				$scope.alerts = ['Error: ' + data];
			})
			.finally(function(data) {
				$scope.updating = false;
			})
	}
	
	$scope.clearUpdates = function() {
		$scope.updates = [];
	}
	
	$scope.clearAlerts = function() {
		$scope.alerts = [];
	}
}
