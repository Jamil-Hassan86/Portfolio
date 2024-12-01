const express = require('express')
const router = express.Router();
const bcrypt = require('bcrypt')
const { check, validationResult } = require('express-validator')

const redirectLogin = (req, res, next) => {
    if (!req.session.userId ) {
      res.redirect('./login') // redirect to the login page
    } else { 
        next (); // move to the next middleware function
    } 
}

router.get('/register', (req, res, next) => {
    res.render('register.ejs')
});

const saltRounds = 10

router.post('/registered', [check('email').isEmail()], [check('password').isLength(8)],[check('username').isLength(3)],[check('first').isLength(1)],[check('last').isLength(1)], function (req, res, next) {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.redirect('./register');
    }
    else {

        const plainPassword = req.body.password

        bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
            if (err) {
                return next(err)
            }
            // Store hashed password in your database.
            let sqlquery = "INSERT INTO user_details (username, first_name, last_name, email, hashedPassword) VALUES (?, ?, ?, ?, ?)"
            // execute sql query
            let newrecord = [req.sanitize(req.body.username), req.sanitize(req.body.first), req.sanitize(req.body.last), req.sanitize(req.body.email), req.sanitize(hashedPassword)]
            db.query(sqlquery, newrecord, (err, result) => {
                if (err) {
                    next(err)
                }
                else {
                    // saving data in database
                    result = 'Hello '+ req.body.first + ' '+ req.body.last +' you are now registered!  We will send an email to you at ' + req.body.email
                    result += 'Your password is: '+ req.body.password +' and your hashed password is: '+ hashedPassword
                    res.send(result)
                }    
            })
        })
    }                                                                            
})


router.get('/login', (req, res, next) => {
    res.render('login.ejs')   
                                                              
})

router.post('/loggedin', function(req, res, next){
    // Search the database
    let sqlquery = "SELECT hashedPassword FROM user_details WHERE username = ?";
    db.query(sqlquery, [req.body.username], (err, result) => {
        if (err) {
          return next(err);
        }
        
        if (result.length === 0) {
        
            return res.send("Username not found.");
        }

        const hashedPassword = result[0].hashedPassword;

        bcrypt.compare(req.body.password, hashedPassword, function(err, result) {
            if (err) {
            
                next(err)
            }
            else if (result == true) {
            
                // Save user session here, when login is successful
                req.session.userId = req.body.username;
                res.redirect('../')

            }
            else {
           
                res.send("Unsuccessful login")
            }
        })
    })    
})

router.get('/logout', redirectLogin, (req,res) => {
    req.session.destroy(err => {
    if (err) {
      return res.redirect('/')
    }
    res.send('You are now logged out. <a href='+'/'+'>Home</a>');
    })
})

module.exports = router; 