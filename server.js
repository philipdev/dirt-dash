/**
 * Created by devx on 2/23/2016.
 */

var udp = require('./udp.js');
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport')
var util = require('util');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var SteamStrategy = require('passport-steam').Strategy;

  
//var socketio = require('socket.io');

passport.use(new SteamStrategy({
    returnURL: 'http://localhost:9999/auth/steam/return',
    realm: 'http://localhost:9999/',
    // apiKey: 'Your API key here'
	profile:false
  },
  function(identifier, profile, done) {
      profile.identifier = identifier;
      return done(null, profile);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

function parseId(identifier) {
	var index = identifier.lastIndexOf('/');
	return identifier.substr(index+1);
}

/**
 * Create http/socket.io server on port
 * @param port
 */
module.exports = function(port, webPath) {
    var app = express();
	//app.use(express.cookieParser());
	app.use(bodyParser.json());
	app.use(cookieParser());
	app.use(require('express-session')({
		secret: 'keyboard cat',
		resave: true,
		saveUninitialized: false,
		cookie: {maxAge: 36000000}
	}));
	
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(function(req, res, next) { 
		if (!req.isAuthenticated()  && req.path.indexOf('/auth') !== 0) {
			console.log('not authenticated redirecting...');
			res.redirect('/auth/steam');
		} else {
			next();
		}
		
	});

	app.post('/getData.json', function(req, res) {
		var ip = req.ip;

		console.log('post body', req.session, ip, req.body);		
		var param = req.body;
		if(req.session && req.session.passport && req.session.passport.user && req.session.passport.user.identifier) {	
			console.log(req.session.passport.user.identifier);
			udp.getData( parseId(req.session.passport.user.identifier), param.from, param.to, function(e, address, data) {
				//console.log('getData response', e, address, data);
				res.end(JSON.stringify(data)); 
			});
		} else {
			res.status(503).end();
		}
	});
	app.post('/getRecordings.json', function(req, res) {
		
		if(req.session && req.session.passport && req.session.passport.user && req.session.passport.user.identifier) {	
			console.log(req.session.passport.user.identifier, req.isAuthenticated());
			udp.getRecordings( parseId(req.session.passport.user.identifier), 30000, function(e, result) {
				console.log('getRecordings response', e, result);
				res.end(JSON.stringify(result)); 
			});
		} else {
			res.status(503).end();
		}
	});
	
	app.get('/auth/steam', passport.authenticate('steam'), function noop(req, res) {});
	
	app.get('/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/auth/fail.html' }), function(req, res) {
		udp.register(req.ip, parseId(req.session.passport.user.identifier)); 
		res.redirect('/chart.html');
	});
	
	udp.listen();
	
	app.use('/', express.static('web' || webPath));
	
    app.listen( port || 9999, '0.0.0.0');

};

if (require.main === module) {
    // start the server without game integration
    module.exports();
}