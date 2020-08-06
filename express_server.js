const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
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
    email: "khalsahero@hotmail.com", 
    password: "hello"
  }
};



//WORK ON RANDOM STRING GENERATOR
  //URL SHORTENING PART 1 WEEK 3 DAY 1
function generateRandomString() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

//Registered Email and Password Comparer 
const userLookup = function(email) {
  for (let userKey in users) {
    let user = users[userKey];
    if (user.email === email) {
      return user;
    }
  }
  return false;
};


//PSUEDO CODE
// Initilize the final value
// Loop over the urlDatabase object
// if the userID of shortURL in urlDatabase is equal to the id passed in
//  push the shortURL to the result
//  return the result

//Only Urls for that User Will Appear 
const urlsForUser = function(id) {
  let userURLS = {};
  for (shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      userURLS[shortURL] = urlDatabase[shortURL];
    } 
  }
  console.log(userURLS);
  return userURLS;
}


//MIDDLEWARE
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));


//ROUTES

//MAIN LANDING PAGE
app.get("/urls", (req, res) => {
  let userID = req.cookies.userID;
  let user = users[userID];
  if (user) {
    let specificUserUrls = urlsForUser(userID)
    let templateVars = { urls : specificUserUrls, user};
    res.render("urls_index", templateVars);
  } else {
    let templateVars = { urls : [], user};
    res.render("urls_index", templateVars);
  }
});

//GET LOGIN ROUTE
app.get("/login", (req, res) => {
  res.render("urls_login");
});

//POST LOGIN ROUTE
app.post("/login", (req, res) => {
  const {email,password} = req.body;
  let result = userLookup(email);
  if(!result) {
    return res.status(403).send("403 Bad Request");
  } else {

    bcrypt
    .compare(password, result.password)
    .then((result) => {
      if (result) {
        res.cookie('userID', result['id']);
        res.redirect("/urls");
      } else {
        res.status(401).send("Bad Username / Password");
      }
    })
    // if (result.password === password) {
    //   res.cookie('userID', result['id']);
    //   res.redirect("/urls");
    // } else {
    //   return res.send("Bad Username / Password");
    // }
  }
});

//LOGOUT ROUTE
app.post("/logout", (req, res) => {
  res.clearCookie('userID');
  res.redirect('/urls');
});

//NEW URL PAGE
app.get("/urls/new", (req, res) => {
  let userID = req.cookies.userID;
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
  let userID = req.cookies.userID;
  const shortURL = generateRandomString();
  const longURL = req.body.longURL;
  urlDatabase[shortURL] = {longURL, userID};
  console.log("GET /urls Database:", urlDatabase);
  res.redirect(`/urls/${shortURL}`);
});

//REGISTERING A NEW USER
app.get('/register', (req, res) => {
  res.render("urls_register",);
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
      console.log('async hash:', hash);
      users[randomId] = {
        id: randomId,
        email: email,
        password: hash
      }
      console.log(users);
      res.cookie('userID', randomId);
      res.redirect('/urls');
    });


  // if (email && password && !users[email]) {
  //   users[randomId] = {
  //     id: randomId,
  //     email: email,
  //     password: password
  //   }
  //   res.cookie('userID', randomId);
  //   // console.log(users);
  //   res.redirect(`/urls`);
  // } else {
  //   res.redirect('/register');
  // }
});


app.get("/urls/:shortURL", (req, res) => {
  let userID = req.cookies.userID;
  let user = users[userID];
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[shortURL].longURL;
  let templateVars = { shortURL, longURL, user};
  console.log("GET /urls/:shortURL log:", longURL);
  
  res.render("urls_show", templateVars)
});

app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[shortURL];
  res.redirect(longURL);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});


app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});


// const urlDatabase = {
//   b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
//   i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" }
// };

//DELETE POST
app.post('/urls/:shortURL/delete', (req, res) => {
  const shortURL = req.params.shortURL;
  if (req.cookies['userID'] === urlDatabase[shortURL].userID) {
    delete urlDatabase[shortURL];
    res.redirect("/urls");
  } else {
    res.status(403).send("Not Logged in");  }
});

//EDIT POST
app.post("/urls/:shortURL/edit", (req, res) => {
  // console.log(req.body);
  const shortURL = req.params.shortURL;
  const newURL = req.body.newURL;
  if (req.cookies['userID'] === urlDatabase[shortURL].userID) {
    urlDatabase[shortURL] = {longURL: newURL, userID: req.cookies['userID']};
    res.redirect("/urls");
  } else {
    res.status(403).send("Not Logged in");  
  }
});
