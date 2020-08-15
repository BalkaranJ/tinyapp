const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require('bcrypt');
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

//GLOBAL OBJECTS

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" }
};

const users = { 
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "hello"
  }
};

//GLOBAL FUNCTIONS

//Random short url number generator
function generateRandomString() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

//Key Comparer 
const userLookup = function(email) {
  for (let userKey in users) {
    let user = users[userKey];
    if (user.email === email) {
      return user;
    }
  }
  return false;
};

//Only Urls for that User Will Appear 
const urlsForUser = function(id) {
  let userURLS = {};
  for (shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      userURLS[shortURL] = urlDatabase[shortURL];
    } 
  }
  return userURLS;
}

//MIDDLEWARE

app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieSession({
  name: 'tinyAppCookie',
  keys: ['onlyOneKey']
}));

//ROUTES

//MAIN LANDING PAGE
app.get("/urls", (req, res) => {
  let userID = req.session.userID;
  let user = users[userID];
  if (user) {
    let specificUserUrls = urlsForUser(userID)
    let templateVars = { urls : specificUserUrls, user};
    res.render("urls_index", templateVars);
  } else {
    res.status(403).send("Not Logged in, must be logged in to existing account to view shortened URLS");
  }
});

//GET LOGIN ROUTE
app.get("/login", (req, res) => {
  let user = null;
  let templateVars = { user };
  res.render("urls_login", templateVars);
});

//POST LOGIN ROUTE
app.post("/login", (req, res) => {
  const {email,password} = req.body;
  const userEmail = userLookup(email);
  if(!userEmail) {
    return res.status(403).send("Non-existent login email, please register");
  } else {
    bcrypt
    .compare(password, userEmail.password)
    .then((result) => {
      if (result) {
        req.session.userID = userEmail['id'];
        res.redirect("/urls");
      } else {
        res.status(401).send("Bad Username / Password");
      }
    })
  }
});

//LOGOUT ROUTE
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

//NEW URL PAGE
app.get("/urls/new", (req, res) => {
  let userID = req.session.userID;
  let user = users[userID];
  let templateVars = { user };
  //Only Registered and Logged in Users can acess the create short url page
  if (!user) {
    res.redirect("/login");
  }
  res.render("urls_new", templateVars);
});

//CREATING A NEW URL
app.post("/urls", (req, res) => {
  let userID = req.session.userID;
  const shortURL = generateRandomString();
  const longURL = req.body.longURL;
  urlDatabase[shortURL] = {longURL, userID};
  res.redirect(`/urls/${shortURL}`);
});

//REGISTERING A NEW USER
app.get('/register', (req, res) => {
  let user = null;
  let templateVars = { user };
  res.render("urls_register", templateVars);
});

//POST REGISTERING A NEW USER
app.post('/register', (req, res) => {
  const {email,password} = req.body;
  let randomId = generateRandomString();
  //Registration Errors
  if(!email || !password || userLookup(email)) {
    return res.status(400).send("400 Bad Request");
  }
  bcrypt
    .genSalt(10)
    .then((salt) => {
      return bcrypt.hash(password, salt);
    })
    .then((hash) => {
      users[randomId] = {
        id: randomId,
        email: email,
        password: hash
      }
      req.session.userID = randomId;
      res.redirect('/urls');
    });
});

app.get("/urls/:shortURL", (req, res) => {
  let userID = req.session.userID;
  let user = users[userID];
  if (user) {
    const shortURL = req.params.shortURL;
    const longURL = urlDatabase[shortURL].longURL;
    let templateVars = { shortURL, longURL, user};  
    res.render("urls_show", templateVars);
  } else {
    res.status(403).send("Not Logged In");
  }
});

//SHORTURL LINK SENDS TO ACTUAL URL
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  let urlRecord = urlDatabase[shortURL];
  if (urlRecord) {
    res.redirect(urlRecord.longURL);
  } else {
    res.send("Not a created short URL");
  }
});

//GOING TO localhost:8080/ logged in will take you to /urls, if not logged in it will take you too /login
app.get("/", (req, res) => {
  let userID = req.session.userID;
  let user = users[userID];
  if (user) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

//Tells you on console what port is being listened too
app.listen(PORT, () => {
  console.log(`TinyApp is listening on PORT ${PORT}!`);
});

//DELETE POST
app.post('/urls/:shortURL/delete', (req, res) => {
  const shortURL = req.params.shortURL;
  if (req.session['userID'] === urlDatabase[shortURL].userID) {
    delete urlDatabase[shortURL];
    res.redirect("/urls");
  } else {
    res.status(403).send("Not Logged in");  }
});

//EDIT POST
app.post("/urls/:shortURL/edit", (req, res) => {
  const shortURL = req.params.shortURL;
  const newURL = req.body.newURL;
  if (req.session['userID'] === urlDatabase[shortURL].userID) {
    urlDatabase[shortURL] = {longURL: newURL, userID: req.session['userID']};
    res.redirect("/urls");
  } else {
    res.status(403).send("Not Logged In");  
  }
});
