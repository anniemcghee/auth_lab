var express = require('express');
var session = require('express-session'); //session has to be required here after npm install
var bodyParser = require('body-parser');
var app = express();
var flash = require('connect-flash') // has to be after session bc it depends on session
var bcrypt = require('bcrypt');

var db = require('./models');

app.set('view engine','ejs');

app.use(express.static(__dirname + '/public')); //middleware requests run sequentially down the page
app.use(bodyParser.urlencoded({extended:false}));
app.use(session({ //don't forget the weird parentheses
    secret:'icansaywordsbackwards',
    resave: false,
    saveUninitialized: true
}));
//Middleware that depends on session has to happen here on index.js - like flash
app.use(flash());

app.use(function(req, res, next){
    req.getUser = function(){
        return req.session.user || false;
    }
    next(); //after the function - you need this to move on
})

app.get('*', function(req,res,next){ //Define ALL locals here then move on 
    var alerts = req.flash();
    res.locals.alerts = alerts; //res.locals is a hidden variable - don't need to render it anymore!
    next(); //must call next to move on to the next route
});

// ---- now that everything is loaded, your app can begin. ONLY GET ROUTES DISPLAY -----

app.get('/',function(req,res){
    var user = req.getUser();
    res.render('index',{user:user}); //changed value of user to user from false
});

app.get('/restricted',function(req,res){
    if (req.getUser()){ //this uses the custom middleware we installed earlier
        res.render('restricted');
    } else {
        res.send('ACCESS DENIED');
    }
});

//login form
app.get('/auth/login',function(req,res){
    res.render('login');
});

app.post('/auth/login',function(req,res){
    //do login here (check password and set session value)

    db.user.find({where: {email:req.body.email}}).then(function(userObj){
        if (userObj){
            bcrypt.compare(req.body.password, userObj.password, function(err,match){
                //the above statement is bcrypt paramenters for .compare using our data 
                //compare returns true or false
                if (match === true) { //this is the second parameter of the third parameter function of compare
                    req.session.user = {
                        id: userObj.id,
                        email: userObj.email,
                        name: userObj.name
                    };
                    res.redirect('/');
                } else {
                    req.flash('info','Invalid password'); //must have the redirect after the req.flash
                    res.redirect('login');
                }
            });
            //check pwd
            // res.send('We will check the pwd now');
        } else {
            req.flash('danger','Unknown user');
            res.redirect('login');
        }
    }) //first thing you type in every post
    //user is logged in forward them to the home page
});

//sign up form
app.get('/auth/signup',function(req,res){

    res.render('signup');
});

app.post('/auth/signup',function(req,res){
    db.user.findOrCreate({
        where: {email: req.body.email}, 
        defaults: {email: req.body.email, name: req.body.name, password: req.body.password}
        }).spread(function(data, created){    
            res.redirect('/'); //spread happens if things go right
    }).catch(function(error){ //catch happens if something goes wrong - now time to use flash
        if (error && error.errors && Array.isArray(error.errors)) { //MUST check both values to get an error msg then be extra sure it's an Array so we don't crash
            error.errors.forEach(function(errorItem){ //gives us back the error item for each object
                req.flash('danger',errorItem.message)
            });
        } else {
            req.flash('danger','Unkown error');
        }
        res.redirect('/auth/signup');
    })
    // res.redirect('/');
});

//logout
//sign up form
app.get('/auth/logout',function(req,res){
    delete req.session.user;
    req.flash('info','You have been logged out.') //bootstrap needed here in first parameter then message
    res.redirect('/');
});

app.listen(3000);