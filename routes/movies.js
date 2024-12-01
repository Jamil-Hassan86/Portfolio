const express = require('express');
const router = express.Router();
const request = require('request');
const db = require('../index.js');

const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('../users/login');  // Redirect to a common login page
    } else {
        next();  // Continue to the next middleware/route handler
    }
};


router.get('/search', redirectLogin, function(req, res, next){
    res.render('search.ejs',  { movies: [], message: null })
})

router.get('/results', function(req, res, next) {

    const movieTitle = req.sanitize(req.query.title)


    const options = {
        method: 'GET',
        url: 'https://imdb-com.p.rapidapi.com/search',
        qs: {
          searchTerm: movieTitle,
          type: 'MOVIE, TV, VIDEO_GAME'
        },
        headers: {
          'x-rapidapi-key': '364367e126msh288f263dcca14f1p1cd158jsn3480fbad9a13',
          'x-rapidapi-host': 'imdb-com.p.rapidapi.com'
        }
    }

    request(options, (error, response, body) => {
        if (error) {
            console.error('API Error:', error);
            return res.status(500).send('Error fetching data from IMDb API.');
        }

        try {
            const data = JSON.parse(body);
            const movies = data.data?.mainSearch?.edges.map(edge => {
                const entity = edge.node.entity;
                return {
                    title: entity.titleText?.text || 'No Title',
                    releaseYear: entity.releaseYear?.year || 'Unknown',
                    image: entity.primaryImage?.url || null,
                    id: entity.id || null
                };
            }) || [];
    
            if (movies.length > 0) {
                res.render('search', { movies, message: null });
            } else {
                res.render('search', { movies: [], message: 'No results found.' });
            }
        } catch (parseError) {
            console.error('Response Parsing Error:', parseError);
            res.render('search', { movies: [], message: 'Error.' });
        }
    })    
})

//
router.get('/:movieId/reviews', (req, res) => {
    const movieId = req.params.movieId;
    const movieTitle = req.query.title;
    const movieImage = req.query.image;

    //
    global.db.query(
        `SELECT r.review_text, r.rating, r.created_at, u.username 
         FROM reviews r 
         JOIN user_details u ON r.user_id = u.id 
         WHERE r.movie_id = ?`,
        [movieId],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error retrieving reviews');
            }
    
        res.render('reviews', { reviews: results, movieId, movieTitle, movieImage });
    });
});

router.post('/:movieId/reviews', (req, res) => {
    const { review_text, rating } = req.body;
    const movieId = req.params.movieId;

    const username = req.session.userId;

    global.db.query('SELECT id FROM user_details WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving user ID');
        }

        if (results.length === 0) {
            return res.status(400).send('User not found');
        }

        const userId = results[0].id;

        const insertQuery = 'INSERT INTO reviews (user_id, movie_id, review_text, rating) VALUES (?, ?, ?, ?)';
        global.db.query(insertQuery, [userId, movieId, review_text, rating], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error saving review');
            }

            global.db.query(
                `SELECT r.review_text, r.rating, r.created_at, u.username 
                 FROM reviews r 
                 JOIN user_details u ON r.user_id = u.id 
                 WHERE r.movie_id = ?`, 
                [movieId], 
                (err, reviews) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Error retrieving reviews');
                    }

                    res.render('reviews', {
                        reviews,
                        movieId,
                        movieImage: req.body.movieImage,
                        movieTitle: req.body.movieTitle
                    });
                }
            );
        });
    });
});

module.exports = router; // Export the router
