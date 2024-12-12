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
            // store hashed password in your database.
            let sqlquery = "INSERT INTO user_details (username, first_name, last_name, email, hashedPassword) VALUES (?, ?, ?, ?, ?)"
            // execute sql query
            let newrecord = [req.sanitize(req.body.username), req.sanitize(req.body.first), req.sanitize(req.body.last), req.sanitize(req.body.email), req.sanitize(hashedPassword)]
            db.query(sqlquery, newrecord, (err, result) => {
                if (err) {
                    next(err)
                }
                else {
                    // saving data in database
                    result = 'Hello '+ req.body.first + ' '+ req.body.last +' you are now registered! '
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
    res.send('You are now logged out. <a href='+'/'+'> Home</a>');
    })
})

//route to show reviews of logged in user
router.get('/:username/reviews', (req, res) => {
    const { username } = req.params;

    //query the user ID based on the username
    global.db.query('SELECT id FROM user_details WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving user ID');
        }

        if (results.length === 0) {
            return res.status(404).send('User not found');
        }

        const userId = results[0].id;

        //fetch reviews
        global.db.query(`
            SELECT r.review_text, r.rating, r.created_at, m.movie_title, m.movie_image 
            FROM reviews r
            JOIN movies m ON r.movie_id = m.movie_id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC`, [userId], (err, reviews) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error retrieving reviews');
            }

            // Render the reviews page and pass the reviews data
            res.render('userReviews', {
                reviews,
                username
            });
        });
    });
});

//renders the usersearch page
router.get('/userSearch', redirectLogin, (req, res) =>{
    res.render('userSearch')
})

//renders the results after the usersearch page
router.get('/userSearchResults', redirectLogin,(req, res) => {
    const searchQuery = req.query.name;

    if (!searchQuery) {
        return res.status(400).send('Search query is required');
    }

    global.db.query(
        `SELECT r.review_text, r.rating, r.created_at, r.movie_id, u.username, m.movie_title, m.movie_image 
         FROM reviews r
         JOIN user_details u ON r.user_id = u.id
         JOIN movies m ON r.movie_id = m.movie_id
         WHERE u.username LIKE ?`,
        [`%${searchQuery}%`],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error searching for reviews');
            }

            res.render('userSearchResults.ejs', { reviews: results, searchQuery });
        }
    );
});

module.exports = router; 