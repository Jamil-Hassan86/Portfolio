const express = require('express')
var ejs = require('ejs')
var session = require ('express-session')
var validator = require('express-validator')
const expressSanitizer = require('express-sanitizer')
const expressRateLimit = require('express-rate-limit')


var mysql = require('mysql2')

const app = express();
const port = 8000;

app.set('trust proxy', true);

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

//Create a session
app.use(session({
    secret: 'noonecanhackthismasterpiece',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}))

app.use(expressSanitizer());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'movie_rater_app',
    password: 'minecraft',
    database: 'movie_app'
})
//Connect to the database
db.connect((err) => {
    if (err) {
        throw err
    }
    console.log('Connected to database')
})
global.db = db


app.locals.appData = {appName: "MoTVGame-Rater"}


//Rate checker
const searchLimit = expressRateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    handler: (req, res) => {
        res.redirect('/?alert=You+have+been+rate-limited.++Returning+to+home+page.');
    }
})

app.use('/movies/results', searchLimit);


const mainRoutes = require('./routes/main');
const movieRoutes = require('./routes/movies');
const userRoutes = require('./routes/users');


app.use('/', mainRoutes);
app.use('/movies', movieRoutes);
app.use('/users', userRoutes);

app.listen(port, () => console.log(`Node app listening on port ${port}!`));

module.exports = db;