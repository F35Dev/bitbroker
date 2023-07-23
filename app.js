require("dotenv").config();
var expressSession = require("express-session");
var morgan = require("morgan");
var express = require("express");
var passport = require("passport");
var routes = require("./routes");
var flashMessages = require("connect-flash");
var middlewares = require("./middlewares");
var User1 = require("./models/user");
var startDb = require("./models/index");
var MongoDBStore = require("connect-mongodb-session")(expressSession);

const sessionStore = new MongoDBStore({
  uri: process.env.DATABASE_URL,
  collection: "sessionStores",
});

sessionStore.on("error", (err) => {
  console.log(err);
});
const threeDays = 3 * 24 * 60 * 60 * 1000;

const app = express();
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));
app.use(
  expressSession({
    secret: process.env.COOKIE_SECRET,
    saveUninitialized: true,
    resave: false,
    store: sessionStore,
    cookie: { signed: true, maxAge: threeDays },
  })
);
app.use(flashMessages());
app.use(passport.initialize());
app.use(passport.session());
app.set("port", process.env.PORT || 3001);
app.set("view engine", "ejs");
app.set("view options", {
  openDelimiter: "[",
  closeDelimiter: "]",
  delimiter: "/",
});

passport.use(User1.createStrategy());

passport.serializeUser(User1.serializeUser());

passport.deserializeUser(User1.deserializeUser());

app.use(middlewares.context);

app.use(routes);

// 404
app.use("*", (req, res) => {
  res.render("error-404");
});

// 500
app.use((err, req, res, next) => {
  res.render("500", { message: err.message, stack: err.stack });
});

startDb();

app.listen(app.get("port"), () => {
  console.log("\n --> Server listening on port ", app.get("port"));
});
