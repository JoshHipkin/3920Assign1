require("./utils.js");
const session = require("express-session");
const express = require("express");
const saltRounds = 12;
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

const app = express();
const port = process.env.PORT || 8000;

const expire = 1 * 60 * 60 * 1000;

app.set('view engine', 'ejs');

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("users");

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);

app.get('/', (req, res) => {
    res.render("index");
});

app.get('/about', (req, res) => {
    
})

app.get("/login", (req, res) => {
  var error = req.query.error;
  var html = `Log in
<form action='/loggingin' method='post'>
<input name='email' type='text' placeholder='Email'>
<input name='password' type='password' placeholder='password'>
<button>Submit</button>
</form>`;
 if (error) {
    html += `<br> Incorrect credential combination`
 }
  res.send(html);
});

app.get("/signup", (req, res) => {
  var missing = req.query.missing;
  var pass = req.query.pass;
  var email = req.query.email;
  var name = req.query.name;
  var exists = req.query.exists;
  var html = `Sign up
<form action='/submitUser' method='post'>
<input name='name' type='text' placeholder='Name'>
<input name='email' type='email' placeholder='Email'>
<input name='password' type='password' placeholder='Password'>
<button>Submit</button>
</form>`;

  if (missing) {
    html += "<br> Please fill in all fields!";
  } else {
    if (name || pass || email) {
        html += "Please fill in following: ";
        if (name) {
            html += "Name ";
        }
        if (pass) {
            html += "Password ";
        }
        if (email) {
            html += "Email ";
        }
    } 
}
if (exists) {
    html += "That email already exists!";
  }

res.send(html);
});

app.post("/submitUser", async (req, res) => {
  var name = req.body.name;
  var password = req.body.password;
  var email = req.body.email;

  const schema = Joi.object({
    name: Joi.string().alphanum().max(20).required(),
    password: Joi.string().max(20).required(),
    email: Joi.string().required(),
  });

  const validationResult = schema.validate({ name, password, email });

  const existingUser = await userCollection
    .find({ email: email })
    .project({ email: email })
    .toArray();

  if (existingUser.length != 0) {
    console.log("user already exists");
    res.redirect("/signup?exists=1");
    return;
  }

  if (name == "") {
    if (email == "") {
      if (password == "") {
        res.redirect("/signup?missing=1");
        return;
      }
      res.redirect("/signup?email=1&name=1");
      return;
    }
    res.redirect("/signup?name=1");
    return;
  }
  if (email == "") {
    if (password == "") {
        res.redirect("/signup?pass=1&email=1");
        return;
    }
    res.redirect("/signup?email=1");
    return;
  }
  if (password == "") {
    if (name == "") {
        res.redirect("/signup?pass=1&name=1");
        return;
    }
    res.redirect("/signup?password=1");
    return;
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds);
  await userCollection.insertOne({
    name: name,
    password: hashedPassword,
    email: email,
  });
  console.log("signup successful");
  req.session.authenticated = true;
  req.session.name = name;
  res.redirect("/");
});

app.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(email);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login");
    return;
  }
  const result = await userCollection
    .find({ email: email })
    .project({ name: 1, email: 1, password: 1, _id: 1 })
    .toArray();

  if (result.length != 1) {
    res.redirect("/login?error=1");
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("Great success!");
    req.session.authenticated = true;
    req.session.email = email;
    req.session.name = result[0].name;
    req.session.cookie.maxAge = expire;

    res.redirect("/loggedin");
    return;
  } else {
    res.redirect("/login?error=1");
    return;
  }
});

app.get("/loggedin", (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/login");
  } else {
    res.redirect("/members");
  }
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

const imageUrl = ["miketyson.gif", "michaelscott.jpg", "hellothere.gif"];

app.get("/image/:id", (req, res) => {
  var pic = req.params.id;
  if (pic == 1) {
    res.send(`<img src= '/${imageUrl[0]}'>`);
  } else if (pic == 2) {
    res.send(`<img src= '/${imageUrl[1]}'>`);
  } else if (pic == 3) {
    res.send(`<img src= '/${imageUrl[2]}'>`);
  }
});

app.get("/members", (req, res) => {
  if (!req.session.name) {
    res.redirect("/");
    return;
  }

  const name = req.session.name;
  const pic = imageUrl[Math.floor(Math.random() * imageUrl.length)];

  const html = `<h1>Welcome to the elite members club, ${name}</h1>
        <img src= "/${pic}" alt= "oops, there's supposed to be an image here"
        <br>
        <a href = "/logout"><button>Log out</button></a>`;
  res.send(html);
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
  res.status(404);
  res.send("404 - Page not found");
});

app.listen(port, function () {
  console.log("Listening on port " + port + "!");
});