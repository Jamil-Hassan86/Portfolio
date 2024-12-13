const express = require('express');
const router = express.Router();
const request = require('request');

//function to get the userid of a user by ussing session username
async function getUserId(username) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id FROM user_details WHERE username = ?';
        global.db.query(query, [username], (err, results) => {
            if (err) {
                console.error(err);
                reject('Error retrieving user ID');
            } else if (results.length === 0) {
                reject('User not found');
            } else {
                resolve(results[0].id);
            }
        });
    });
}

const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('../users/login');  // Redirect to a common login page
    } else {
        next();  // Continue to the next middleware/route handler
    }
};

//renders search page
router.get('/search', redirectLogin, function(req, res, next){
    res.render('search.ejs',  { movies: [], message: null })
})

//renders what the user searched in the search page
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
            return res.status(500).send('Error fetching data from IMDb API.')
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
                }}) || [];
    
            if (movies.length > 0) {
                res.render('search', { movies, message: null });
            } else {
                res.render('search', { movies: [], message: 'No results found.' });
            }
        } catch (parseError) {
            console.error('Response Parsing Error:', parseError);
            res.render('search', { movies: [], message: 'Error.' })
        }
    })    
})

//renders the page of selected movie
router.get('/:movieId/reviews', async (req, res) => {

    try {
        const movieId = req.params.movieId;
        const movieTitle = req.query.title;
        const movieImage = req.query.image;
        const username = req.session.userId;

        const userId = await getUserId(username)

        //checks if there are any reviews under the movieID
        global.db.query(
            `SELECT r.review_text, r.rating, r.created_at, r.user_id, u.username, r.id 
            FROM reviews r 
            JOIN user_details u ON r.user_id = u.id 
            WHERE r.movie_id = ?`,
            [movieId],
            (err, results) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Error retrieving reviews');
                }
                
                //Collects average rating of the review
                global.db.query(
                    `SELECT AVG(rating) as avg_rating 
                    FROM reviews 
                    WHERE movie_id = ?`, 
                    [movieId],
                    (err, avgResults) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Error calculating average rating');
                        }

                        const avgRating = avgResults[0].avg_rating != null ? avgResults[0].avg_rating : 0;
                        res.render('reviews', { reviews: results, movieId, movieTitle, movieImage, avgRating: avgRating, userId });
                    }
                );  
        })
    } catch (err) {
        res.status(500).send(err);
    }
})



router.post('/:movieId/reviews', async (req, res) => {
    const { review_text, rating, movieTitle, movieImage } = req.body;
    const movieId = req.params.movieId;
    const username = req.session.userId;

    const userId = await getUserId(username);

    try {
        // Checks if movie has been added to movies table already
        global.db.query('SELECT * FROM movies WHERE movie_id = ?', [movieId], (err, movieResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error checking movie');
            }

            // Add movie to movies table
            if (movieResults.length === 0) {
                const insertMovieQuery = 'INSERT INTO movies (movie_id, movie_title, movie_image) VALUES (?, ?, ?)';
                global.db.query(insertMovieQuery, [movieId, movieTitle, movieImage], (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Error inserting movie');
                    }

                    // New review for movie that doesnt exist in table
                    insertReview();
                });
            } else {
                // Movie already in the movies table
                insertReview();
            }

            // review function
            function insertReview() {
                const insertReviewQuery = 'INSERT INTO reviews (user_id, movie_id, review_text, rating) VALUES (?, ?, ?, ?)';
                global.db.query(insertReviewQuery, [userId, movieId, review_text, rating], (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Error saving review');
                    }

                    // all reviews for a specific movie
                    global.db.query(
                        `SELECT r.review_text, r.rating, r.created_at, u.username, r.id, r.user_id 
                         FROM reviews r 
                         JOIN user_details u ON r.user_id = u.id 
                         WHERE r.movie_id = ?`, 
                        [movieId], 
                        (err, reviews) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send('Error retrieving reviews');
                            }

                            global.db.query(
                                `SELECT AVG(rating) AS avg_rating 
                                 FROM reviews 
                                 WHERE movie_id = ?`, 
                                [movieId], 
                                (err, avgResults) => {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).send('Error calculating average rating');
                                    }

                                    
                                    const avgRating = avgResults[0].avg_rating != null ? avgResults[0].avg_rating : 0;

                                    // render the reviews page with the reviews and average rating
                                    res.render('reviews', {
                                        reviews,
                                        movieId,
                                        movieImage: movieImage,
                                        movieTitle: movieTitle,
                                        avgRating: avgRating,
                                        userId  
                                    });
                                }
                            );

                        }
                    );
                });
            }
        });
    } catch (err){
        res.status(500).send(err);
    }
});

//route for editing a review
router.get('/:movieId/reviews/edit/:reviewId', (req, res) => {
    const { movieId, movieImage, movieTitle } = req.query;
    const reviewId = req.params.reviewId; 
    const username = req.session.userId; 

    // Check if the user is logged in
    if (!username) {
        return res.status(401).send('You must be logged in to edit a review');
    }

    // Retrieve user ID from username
    global.db.query('SELECT id FROM user_details WHERE username = ?', [username], (err, userResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving user ID');
        }
        //error handler
        if (userResults.length === 0) {
            return res.status(400).send('User not found');
        }
        
        //fetch the review data
        const reviewQuery = `
            SELECT id AS review_id, user_id, review_text, rating 
            FROM reviews 
            WHERE id = ? AND movie_id = ?;
        `;

        global.db.query(reviewQuery, [reviewId, movieId], (err, reviewResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error retrieving review');
            }

            //if no review is found, handle error
            if (reviewResults.length === 0) {
                return res.status(404).send('Review not found');
            }

            const review = reviewResults[0];
            //render page
            res.render('editReview', {
                review,
                movieId,
                movieImage, 
                movieTitle
            });
        });
    });
});

router.post('/:movieId/reviews/edit/:reviewId', (req, res) => {
    const { review_text, rating, movieImage, movieTitle } = req.body;
    const reviewId = req.params.reviewId; 
    const movieId = req.params.movieId; 

    if(req.baseUrl == '/movies'){
        req.baseUrl = '';
    }


    //gets the reviews id
    global.db.query('SELECT user_id FROM reviews WHERE id = ?', [reviewId], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving review');
        }

        global.db.query(
            'UPDATE reviews SET review_text = ?, rating = ? WHERE id = ?',
            [review_text, rating, reviewId],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Error updating review');
                }

                //redirect to the reviews page for the movie
                res.redirect(`${req.baseUrl}/movies/${movieId}/reviews?title=${encodeURIComponent(movieTitle)}&image=${encodeURIComponent(movieImage)}`);
            }
        );
    });
});

router.post('/:movieId/reviews/delete/:reviewId', (req, res) => {
    const reviewId = req.body.reviewId
    const movieId = req.body.movieId
    const userId = req.body.userId
    const movieImage = req.body.movieImage
    const movieTitle = req.body.movieTitle

    if(req.baseUrl == '/movies'){
        req.baseUrl = '';
    }

    

    //getting review of user so they can only delete reviews they made
    global.db.query('SELECT user_id FROM reviews WHERE id = ?', [reviewId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving review');
        }

        if (results.length === 0) {
            return res.status(404).send('Review not found');
        }

        const review = results[0];

        //check if logged in user made review
        if (review.user_id !== parseInt(userId)) {
            return res.status(403).send('You are not authorized to delete this review');
        }

        //delete the review
        global.db.query('DELETE FROM reviews WHERE id = ?', [reviewId], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error deleting review');
            }
            //redirect back to movie review page
            res.redirect(`${req.baseUrl}/movies/${movieId}/reviews?title=${encodeURIComponent(movieTitle)}&image=${encodeURIComponent(movieImage)}`);
        });
    });
});


module.exports = router;
