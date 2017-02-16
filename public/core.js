var scotchTodo = angular.module('scotchTodo', []);

function mainController($scope, $http) {
	$scope.newStocks = {};
	$scope.changeAlert = function(key){
		$scope.newStocks[key].alertValue = (parseFloat($scope.newStocks[key].dayHigh) * (100-parseInt($scope.newStocks[key].alertPercentage))/100).toFixed(2);
	}
	$scope.fetchStockData = function($event){
		var key = $event.keyCode;
    	if($event.which === 13) {
    		$scope.newStocks = {};
    		var symbols = '"' + $scope.codes.join('","') + '"';
    		var base = "https://query.yahooapis.com/v1/public/yql?q=";
    		var query = "select Symbol, DaysHigh, Name from yahoo.finance.quotes where symbol in (" + symbols + ")";
    		var format = "&format=json&diagnostics=true";
    		var env = "&env=store://datatables.org/alltableswithkeys";
    		var url = base + query + format + env;
    		 $http.get(url)
			    .then(function(response) {
			    	if (!response.data.query.count){
			    		// No results found
			    	}
			    	else if (response.data.query.count == 1){
			    		var quote = response.data.query.results.quote;
			    		if(quote.Name){
			    			// No match on symbol
			    			$scope.newStocks[quote.Symbol.toUpperCase()] = {
			    				"dayHigh": quote.DaysHigh,
			    				"name": quote.Name,
			    				"alertPercentage": 20,
			    				"alertValue": (parseFloat(quote.DaysHigh) * 0.80).toFixed(2)
			    			}
			    		}
			    		else {
			    			// No match found
			    		}
			    		
			    	}
			    	else {
			    		response.data.query.results.quote.forEach(function(quote){
			    			if(quote.Name){
				    			$scope.newStocks[quote.Symbol.toUpperCase()] = {
				    				"dayHigh": quote.DaysHigh,
				    				"name": quote.Name,
				    				"alertPercentage": 20,
				    				"alertValue": (parseFloat(quote.DaysHigh) * 0.80).toFixed(2)
				    			}
			    			} 
			    			else {
			    				// no match found
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
	// when landing on the page, get all todos and show them
	$http.get('/api/stocks')
		.success(function(data) {
			$scope.stocks = data;
		})
		.error(function(data) {
			console.log('Error: ' + data);
		});

	// when submitting the add form, send the text to the node API
	$scope.createStock = function(key) {
		var postData = {
			"code": $scope.newStocks[key].code,
			"name": $scope.newStocks[key].name,
			"dayHigh": $scope.newStocks[key].dayHigh,
			"alertPercentage": $scope.newStocks[key].alertPercentage,
			"alertAmount": $scope.newStocks[key].alertAmount
		}
		delete $scope.newStocks[key]; 
		$http.post('/api/stocks', postData)
			.success(function(data) {
				$scope.newStocks = {}; // clear the form so our user is ready to enter another
				$scope.stocks = data;
				console.log(data);
			})
			.error(function(data) {
				console.log('Error: ' + data);
			});
	};

	// delete a todo after checking it
	$scope.deleteTodo = function(id) {
		$http.delete('/api/todos/' + id)
			.success(function(data) {
				$scope.todos = data;
			})
			.error(function(data) {
				console.log('Error: ' + data);
			});
	};

}
