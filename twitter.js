/****************************************************************
*	Notes: 
*		- ALL POST PARAMETERS ARE JSON (application/json)
*		- ALL RETURN TYPES MUST BE JSON AS WELL
*
*****************************************************************/



var express = require('express'); // EXPRESS MODULE
var parser = require('body-parser');//forparsing req params, will change to multer
var mongoose = require("mongoose");
var path = require ("path");
var bcrypt = require('bcrypt');
var nev = require('email-verification')(mongoose);
var User = require('./models/userModel.js');
var TempUser = require("./models/userTempModel.js");
var shortid = require('shortid');
var cookieSession = require('cookie-session');

const util = require('util');
mongoose.connect('mongodb://130.245.168.124/twitterUsers');
var app = express();


//module setup
app.use(parser.urlencoded({extended: true}));
app.use(parser.json());
app.use(cookieSession({
	name: "session",
	keys: ['key1, key2']
}))

/******* Hash setup **************/
var myHasher = function (password, tempUserData, insertTempUser, callback){
	var hash = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
	return insertTempUser(hash, tempUserData, callback);
}

/********** Configure Email verification **********/
nev.configure({

	persistentUserModel: User,
	tempUserModel: TempUser,
	expirationTime: 1000,
	URLFieldName: "URL",
	verificationURL: "http://130.245.168.124/verify/${URL}",
	hashingFunction: myHasher,
	passwordFieldName:"password",
	//check proper transportOption configuration

	transportOptions: {
		service:'Gmail',
		auth: {
			user: 'brobicheaucse356',
			pass: 'cse356elizapassword'
		}
	},
	verifyMailOptions: {
		from: 'Do Not Reply brobicheaucse356',
		subject: "Confirm Eliza Account",
		html: "Click the link to confirm account: $URL",
		text: 'Confirm Account by clicking the link:${URL}'
	},
	shouldSendConfirmation: true,
	confirmMailOptionsL:{
		from:'Do Not Reply brobicheaucse356',
		subject: 'Successfully verified',
		html: '<p>Your account has been successfully verified.</p>',
		text:'Your account has been successfully verified.'
	}
	}, function (error, options){

});


//MAIN PAGE OF TWITTER
app.post('/', function(req, res) {
	console.log("GET REQUEST SUCCESSFUL");
	res.send();
});

app.get('/', function(req, res){
	console.log("TESTING");
	res.send();
})


/********************************************
*	/adduser description - POST: 
*	This request will register a new user account IF 
*	the username AND email are unique. It must then send
* 	email with verification key (Use nodes email-verification module)
*
*	Request Parameters
*		- username = req.body.username
*		- email = req.body.email
*		- password = req.body.password
*
*	Return:
*	-	status: "OK" or "error"
*	- error: error message(if error)
*
************************************************/		
app.post('/adduser', function(req,res){


	//get the username, password and email
	var username = req.body.username;
	var password = req.body.password;
	var email = req.body.email;

	//create a json obejct to create the user containing
	// the user information and status ok for checking
	var newUser = User ({
		username : username,
		password : password,
		email : email,
		status : "OK"
	});

	nev.createTempUser (newUser, function(err, existingPersistentUser, newTempUser){

		//if there was a problem in creating the temp user
		if(err){
			//should send some sort of error back to client 
			console.log(err);
		}

		//if the user alreadt exsists in the database
		if(existingPersistentUser)
			//should send back respnose

		//otherwise we have successfully created a new temp user
		if(newTempUser){

			//grab the URL from the new users data
			var URL = newTempUser[nev.options.URLFieldName]; 

			//send an email with that url to the user to verify their account
			nev.sendVerificationEmail(email, URL, function(err, info){

				//if there was an error in sending the email
				if(err){
					//send some sort of error back to tuser
					console.log(err);
					return;
				}

				//if everything went back send the data back to the client
				res.send(newUser);	

			});//end send emmail

		}
		else {
			//dont realyl need this else
			//its the error field for if threr was no temp user either
			console.log("ERROR");	
		}
	})
});//end /adduser


/********************************************
*	/login description - POST: 
*	This post request will log the user into the site IF its 
*	username and password are found in the database. It will then set
*	the users cookie to enable the session. 
*
*	Request Parameters
*		- username = req.body.username
*		- password = req.body.password
*
*	Return:
*	-	status: "OK" or "error"
*	- error: error message(if error)
*
************************************************/
app.post("/login", function(req, response){

	//use the mongoose User model to find the user data with the username given
	User.findOne({username: req.body.username}, function(err, user){

		//if we found a user by that name
		if(user){

			//hash their password
			bcrypt.hash(req.body.password, user.password).then(function(res){

				//set the data and ID fields for adding to database
				var date = Date();
				var id = shortid.generate();

				//set the cookies so we know theres a sesson going on
				//this should be below the password check
				req.session.id = id;

				//if the password we got from the user is the one in the database
				if (res === user.password){

					//create the starting database items
					convo = {
						'id': id,
						'start_date': date,
						'status': "OK"
					};
					startConvo = {
						'id': id,
						'conversation' :[],
						'status':'OK'
					};

					//use the conversation model to create the item in the database
					//This is the model that tells us the ID of the conversation to 
					//lookup later
					Conversations.create(convo, function(err, user){

						//if there was an error
						if(err)

							//show the erorr and pronbably should send it to the user
							conole.log("ERROR INSERTING CONVERSAION" + err);

						else
							//else there was no error
							console.log("NEIN");
					});

					//this is the actual conversation between the user and 
					//eliza during this session
					//we create it like the previous, but will add to the conversatoin array
					//as the conversation goes on
					SingleConversation.create(startConvo);

					//set the username for the session
					req.session.currentUser = req.body.username;

					//prepare response to sendt o the user
					var json = {
						"username": req.body.username,
						"date": date,
						"status": "OK"
					};	

					//respond to user
					response.json(json);
				}
				//else theres an errror
				else 
					//show errror
					console.log("not user");
			});
		}
		//else error
		else
			//theres an error here 
			console.log(err);
	});// end find one function
});//end /login

/********************************************
*	/logout description - POST: 
*	This will log the user out by setting its session cookie to null
*
*	Request Parameters
*		- NONE
*
*	Return:
*	-	status: "OK" or "error"
*	- error: error message(if error)
*
************************************************/
app.post('/logout', function(req,res){
	//set the cookies to null
	req.session = null;

	//tell the client everything is peachy
	res.send({status: "OK"});
});//end /logout


/********************************************
*	/verify description - POST: 
*	This will verify users account using its email and a backdoor key
*	Users account cannot be used until it is verified.
*
*	Request Parameters
*		- email = req.body.email
		- key = req.body.key = "abracadabra" (backdoor)
*
*	Return:
*	-	status: "OK" or "error"
*	- error: error message(if error)
*
************************************************/
app.post('/verify', function(req,res){


	//grab the key and create varibales for the url and reutrn json
	var key = req.body.key;
	var url;
	var json;

	//this was probably used for testing, cant remember
	var tempJson = {
		email: req.body.email
	};

	//use the temp user model and find the json with the corresponding email
	TempUser.findOne({email:req.body.email}, function(err, user){

		//if there was an error
		if(err){
			//should be sending the client somme sort of error
			console.log("err");
		}

		//if we found a user with that email
		if(user){
			
			//get the URL in the user JSON (defined in the model schema)
			url = user.URL ;
		}

		//this is the key crap for backdooring user verification
		if (key === "abracadabra" && url){

			//confirm the user with the URL we got 
			nev.confirmTempUser(url, function(err, user){

				//if there was an error
				if (err){

					//display error and send client an error message
					console.log(err);
					json = {
						status: "ERROR"
					};	
					res.json(json);
				}

				//otherwise let user know it all went ok
				if(user){

					json = {
						status: "OK"
					};
					res.json(json);
				}
			})
		}		
	});
});// end /verify

/********************************************
*	/additem description - POST: 
*	This will post a new tweet only if a user is found in session
*
*	Request Parameters
*		- content = req.body.content
*		- parent(STAGE 3) = req.body.parent = 
*
*	Return:
*	-	status: "OK" or "error"
	- id: uniqur tweet IF (if OK)
*	- error: error message(if error)
*
************************************************/
app.post('/additem', function(req,res){


});


/********************************************
*	/item/<id> description - GET: 
*	Searches and returns for tweet of given ID
*
*	Request Parameters
*		- NONE
*
*	Return:
*	-	status: "OK" or "error"
*	- item: {
*		- id : tweet id
*		- username: username who sent tweet
*		- content: message body of tweet
*		- timestamp: timestamp, represeted as Unix time in seconds
*	}
*	- error: error message(if error)
*	- media(STAGE 3): ID of asssociated media file(if any)
*
************************************************/
app.get('/item/<id>', function(req,res){

});

/********************************************
*	/item/<id> description - DELETE (STAGE 2): 
*	Deletes tweet of given ID, also deleteds associated media
*
*	Request Parameters
*		- NONE
*
*	Return:
*	- success or failure
*
************************************************/
app.delete('/item/<id>', function(req,res){


});


/********************************************
*	/search description - POST : 
*	Gets list of all tweets(Expand description later)
*
*	Request Parameters
*		- timestamp: search tweets from this time and earlier
*			- Represented as Unix time in seconds
*			- Integer, optional
*			- Default: Current time
*		- limit: number of tweets to return
*			- Integerr, option
*			- Default: 25
*			- Max: 100
*		(STAGE 2 REQUEST PARAMS)
*			- q: search query
*			- username: username
*				- String optional
*				- Filter by username
*			- following: only show tweets made by users that logged in user follows
*				- Booklean, optional
*				- Default: true
*		(STAGE 3 PARAMS)
*			- rank: Orfer returned tweets by 'time' or by "interest" (weighting itme vs number of likes and retweets)
*				- String optional
*				- Default: true
*			- parent: Returns tweets made in reply to requested tweet
*				- Boolean, optional
*				- Default: false
*	Return:
*	- status: "OK" or "error"
*	- items: Array of tweet objects (see/item/:id)
*	- error: error message (if error)
*
************************************************/
app.post('/search', function(req,res){


});

/********************************************
*	/user/<username> description - GET (STAGE 2): 
*	Gets the users profile information
*
*	Request Parameters
*		- username: username to retrieve = req.body.username
*
*	Return:
*	- status: "OK" or "error"
*	- user: {
*		- email: 
*		- followers: follower count
*		- following: following count
*	}
*
************************************************/
app.get('/user/<username>', function(req,res){


});


/******************************************************************
*	/user/<username>/followers description - GET (STAGE 2): 
*	Gets list of users following "username"
*
*	Request Parameters
*		- limit: number of usernames to return = req.body.username
*			- Integer, optional
*			- Default: 50
*			- Max: 200
*
*	Return:
*	- status: "OK" or "error"
*	- users: list of usernames (strings) 
*
*******************************************************************/
app.get('/user/<username>/followers', function(req,res){


});


/******************************************************************
*	/user/<username>/following description - GET (STAGE 2): 
*	Gets list of users "username" is following
*
*	Request Parameters
*		- limit: number of usernames to return = req.body.username
*			- Integer, optional
*			- Default: 50
*			- Max: 200
*
*	Return:
*	- status: "OK" or "error"
*	- users: list of usernames (strings) 
*
*******************************************************************/
app.post('/user/<username>/following', function(req,res){


});


/******************************************************************
*	/follow description - POST (STAGE 2): 
*	Followsor unfollows a user
*
*	Request Parameters
*		- username: username to follow = req.body.username
*		- follow: = req.body.follow
*			- Boolean
*			- Default: true
*
*	Return:
*	- status: "OK" or "error"
*
*******************************************************************/
app.post('/follow', function(req,res){


});


/******************************************************************
*	/item/<id>/like description - POST (STAGE 3): 
*	Likes or unlikes a tweet ID
*
*	Request Parameters
*		- like: = req.body.like
*			- Boolean
*			- Default: true
*
*	Return:
*	- status: "OK" or "error"
*
*******************************************************************/
app.post('/item/<id>/like', function(req,res){


});


/******************************************************************
*	/addmedia description - POST (STAGE 3): 
*	adds media file (photo or video)
*
*	Request Parameters (type is multipart/form-data (gotta use multer module))
*		- content: binary content of ile being uploaded = req.file.content
*
*	Return:
*	- status: "OK" or "error"
*	- id: ID of uploaded media
*	- error: error message (if error)
*
*******************************************************************/
app.post('/addmedia', function(req,res){


});


/******************************************************************
*	/media/<id> description - GET (STAGE 3): 
*	Gets media file by id
*
*	Request Parameters (type is multipart/form-data (gotta use multer module))
*		- content: binary content of ile being uploaded = req.file.content
*
*	Return:
*	- returns media file (image or video)
*
*******************************************************************/
app.post('/media/<id>', function(req,res){


});



/* using reverse proxy, so listening on localhost port 300x*/
app.listen(3000, 'localhost');
console.log("listening on port 3000");