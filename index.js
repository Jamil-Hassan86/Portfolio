const express = require('express');
var ejs = require('ejs')
var session = require ('express-session')
var validator = require('express-validator')
const expressSanitizer = require('express-sanitizer');

//Import mysql module
var mysql = require('mysql2')

const app = express();
const port = 8000;

// Set up the body parser 
app.use(express.urlencoded({ extended: true }))

// Set up public folder (for css and statis js)
app.use(express.static(__dirname + '/public'))



// Start the web app listening
app.listen(port, () => console.log(`Node app listening on port ${port}!`))