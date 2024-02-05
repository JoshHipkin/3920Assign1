require("./utils.js");
const session = require("express-session");
const express = require("express");
const bodyParser = require('body-parser');
const saltRounds = 12;
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");


require("dotenv").config();


const db_users = include('database/users');

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

const app = express();
const port = process.env.PORT || 3090;

const expireTime = 1 * 60 * 60 * 1000;

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: true}));

var mongoStore;
try {
    mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}`,
    crypto: {
      secret: mongodb_session_secret,
    },
  });
  console.log("mongoStore created successfully");
} catch (error) {
  console.error('Error creating MongoStore:', error);
}

if (mongoStore) {
  app.use(
    session({
      secret: node_session_secret,
      store: mongoStore,
      saveUninitialized: false,
      resave: true,
    })
  );
} else {
  console.error('MongoStore not created. Session storage will not work properly.');
}


//middleware
function isValidSession(req) {
  if (req.session.authenticated) {
    return true;
  }
  return false;
}

function sessionValidation(req, res, next) {
  if(!isValidSession(req)) {
    req.session.destroy();
    res.redirect('/');
    return
  } else {
    next();
  }
}


app.get('/', (req, res) => {
    res.render("index");
});

app.get('/createTables', (req, res) => {
  const create_tables = include('database/create_tables');
  var success = create_tables.createTables();
  if (success) {
    res.send("Success creating tables.");
  } else {
    res.send("error creating tables.");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  const existingUser = req.query.existingUser;
  const missingUser = req.query.missingUser;
  const missingPass = req.query.missingPass;
  res.render("signup", { existingUser : existingUser, missingUser : missingUser, missingPass : missingPass});
});

app.post("/signingup", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username && !password) {
    res.redirect("/signup?missingUser=1&missingPass=1");
    return;
  } else if (!password) {
    res.redirect("/signup?missingPass=1");
    return;
  } else if (!username) {
    res.redirect("/signup?missingUser=1");
    return
  }

  const hashedPassword = bcrypt.hashSync(password, saltRounds);

    try {
      const success = await db_users.createUser({user : username, hashedPassword : hashedPassword});
      
      if (success) {
        req.session.authenticated = true;
        req.session.username = username;
        req.session.cookie.maxAge = expireTime;
        res.status(200);
        res.redirect("/loggedin");
      } else {
        res.status(500).send("Error creating user");
      }
    } catch (error) {
      console.error("Error creating user ", error);
      res.status(500).send("Error creating user");
    }
});

app.post('/loggingin', async (req,res) => {
  var username = req.body.username;
  var password = req.body.password;


  var results = await db_users.getUser({ user: username});

  if (results) {
      if (results.length == 1) {
          if (bcrypt.compareSync(password, results[0].password)) {
              req.session.authenticated = true; 
              req.session.username = username;
              req.session.cookie.maxAge = expireTime;
      
              res.redirect('/loggedIn');
          }
          else {
              console.log("invalid password");
          }
      }
      else {
          console.log('invalid number of users matched: '+results.length+" (expected 1).");
          res.redirect('/login');
          return;            
      }
  }
});


app.get("/loggedin", sessionValidation, async (req, res) => {
  res.render("loggedin", {name: req.session.username});
});

const imageUrl = ["mindy-kaling-website.gif", "rock.jpg", "web-webdevelopper.gif"];

app.get("/members", sessionValidation, async (req, res) => {
  const imgNum = Math.floor(Math.random() * imageUrl.length);
  res.render("members", {name: req.session.username, imgUrl : imageUrl[imgNum] });
});

app.get("/logout", (req, res) => {
  req.session.destroy((e) => {
    if (e) {
      console.log(e);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/users", async (req, res) => {
  try {
    const users = await db_users.getUsers();
    if (users) {
      res.render("users", {users : users});
    }
  } catch (error) {
    console.log("Error finding users");
    console.log(error);
  }
});

app.get("/deleteusers", async (req, res) => {
  const deleteUsers = include('database/delete_users');
  try {
    deleteUsers.deleteUsers();
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
})



app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
  res.status(404);
  res.render("404");
});

app.listen(port, function () {
  console.log("Listening on port " + port + "!");
});