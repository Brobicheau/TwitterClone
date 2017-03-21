var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {
	
	$scope.user = {
		username: "",
		email: "",
		password: ""
	};



	$scope.createAccount = function(){
		request = {
			username: $scope.user.username,
			email: $scope.user.email,
			password: $scope.user.password
		};

		$http.post('/login', request).then(createAccountSuccess, createAccountError){

			function(createAccountSuccess){
				console.log("SUCCESSFULLY LOGGED IN");
			}

			function(createAccountError){
				console.log("ERROR WHEN LOGGING IN");
			}
		}
	}
}]);//end controller