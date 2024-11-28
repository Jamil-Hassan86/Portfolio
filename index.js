const express = require('express')
var ejs = require('ejs')
var session = require ('express-session')
var validator = require('express-validator')
const expressSanitizer = require('express-sanitizer')


//Import mysql module
var mysql = require('mysql2')

const app = express();
const port = 8000;

// Set up EJS
app.set('view engine', 'ejs');

// Middleware for parsing and serving static files
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Create a session
app.use(session({
    secret: 'noonecanhackthismasterpiece',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}))

// Create an input sanitizer
app.use(expressSanitizer());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'movie_rater_app',
    password: 'minecraft',
    database: 'movie_app'
})
// Connect to the database
db.connect((err) => {
    if (err) {
        throw err
    }
    console.log('Connected to database')
})
global.db = db

// Import route files
const mainRoutes = require('./routes/main');
const movieRoutes = require('./routes/movies');
const userRoutes = require('./routes/users');

// Use the routes
app.use('/', mainRoutes);
app.use('/movies', movieRoutes);
app.use('/users', userRoutes);

// Start the app
app.listen(port, () => console.log(`Node app listening on port ${port}!`));