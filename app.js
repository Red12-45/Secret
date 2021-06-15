
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
// const encrypt= require("mongoose-encryption")
// const md5=require("md5");
// const bcrypt = require("bcrypt");
const session = require('express-session');
const passport = require('passport');
// const passportLocal = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');

const findOrCreate =require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: process.env.secret,
    resave : false,
    saveUninitialized:true
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://Bangthai:428jesqb9t@cluster0.dkzah.mongodb.net/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.set("useCreateIndex", true)
const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret: String
})
userSchema.plugin(passportLocalMongoose);// used to hash and salt password and to 
                                          //save to save our users into our mongo database.
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, {secret:secret, encryptedFields:["password"]});

userSchema.plugin(findOrCreate);

const User =new mongoose.model("User", userSchema);
passport.use(User.createStrategy()); //This part is handled by the passport-local-mongoose
                                    //for serialising and deserialzing
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
    done(null, user.id); 
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

// const saltrounds = 10;

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) { //accessToken:Where google sends data related to the user
    //refreshToken: Which allows us to access the user data for a longer period of time ,
    //profile: Contains emails, google id and anything else that we have access to
    // console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render('home')
})

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/")
})



app.get('/auth/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}}, function(err,foundData){
        if(err){
            console.log(err)
        }else{
            if(foundData){
                res.render("secrets",{userWithSecret:foundData})
            }
        }
    })
      
})



app.get("/submit",function(req,res){
    if(req.isAuthenticated()) {
        res.render("submit")
    }else{
        res.redirect("/login")
    }
      
})

app.post("/submit",function(req,res){
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, function(err,foundUser){
        if(err){
            console.log(err)
        }else{
            if(foundUser){
                foundUser.secret = submittedSecret
                foundUser.save(function(){
                    res.redirect("/secrets")
                })
            }
        }
    })
})

app.get("/register", function(req, res){
    res.render('register')
})

app.post("/register",function(req, res){
    // bcrypt.hash(req.body.password, saltrounds, function(err,hash){
       
    //     const newUser = new User({
    //         email:req.body.username,
    //         password:hash
    //     })
    // newUser.save(function(err){
    //     if(err){
    //         console.log(err);
    //     }else{
    //         res.render("Secrets")
    //     }
    // })
    // })
    User.register({username:req.body.username}, req.body.password,function(err,user){//handled by the passportlocalMongoose
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){//the res and req is triggered if only the user is
                                                            // authenticated. And user  session created here too.
             res.redirect("/secrets");

            })
        }
    })

})

app.get("/login", function(req, res){
    res.render('login')
})

app.post("/login",function(req,res){
  
    // const username = req.body.username;
    // const password = req.body.password
    // User.findOne({email:username}, function(err,foundUser){
    //     if(err){
    //         console.log(err);
    //     }else{
    //         if(foundUser){
    //             bcrypt.compare(password, foundUser.password, function(err,results){
    //                 if(results===true){
    //                     res.render("secrets")
    //                 }
    //             })
    //         }
    //     }
    // })
    const user = new User({
        username: req.body.username,
        password: req.body.password
      });
    
      req.login(user, function(err){
        if (err) {
          console.log(err);
        } else {    
          passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
          });
        }
      });

})

app.listen(process.env.PORT || 3000, ()=>{
    console.log("Server started on port 3000");
})