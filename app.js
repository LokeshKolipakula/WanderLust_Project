const express = require("express");
const app = express();
const port = 8080;

// Env file 
if ( process.env.NODE_ENV != "production" ) {
    require("dotenv").config();
}

// Override

const methodOverride = require("method-override");
app.use(methodOverride("_method"));

//Ejs
const path = require("path");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(express.static(path.join(__dirname, "/public")));

// EJS mate
const ejsMate = require("ejs-mate");
app.engine('ejs', ejsMate);


// Database
const mongoose = require("mongoose");
const dbUrl = process.env.ATLASDB_URL;


// wrapAsync && ExpressError's
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");

// Routes 
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");


// Session
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const store = MongoStore.create({
    mongoUrl : dbUrl,
    crypto : {
        secret : process.env.SECRET,
    },

    touchAfter : 24 * 3600,
})

store.on("error", ()=>{
    console.log("Error in MONGO SESSION STORE", err);
})

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        http: true,
    }
}

// Flash
const flash = require("connect-flash");


// Passport 
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");


main().then(() => {
    console.log("Connected to DB.")
})
    .catch((err) => {
        console.log(err);
    })

async function main() {
    await mongoose.connect(dbUrl);
}

app.use(session(sessionOptions));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/",userRouter);



// Errors

app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found !!!"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong !!" } = err;
    res.status(statusCode).render("./Errors/error.ejs", { message });
    // res.status(statusCode).send(message);
})

app.listen(port, () => {
    console.log(`server is lisitening to port${port}.`);
})  