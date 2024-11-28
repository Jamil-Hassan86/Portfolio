const express = require('express');
const router = express.Router();
const request = require('request');

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

    const movieTitle = req.query.title


    const options = {
        method: 'GET',
        url: 'https://imdb-com.p.rapidapi.com/search',
        qs: {
          searchTerm: movieTitle
        },
        headers: {
          'x-rapidapi-key': '364367e126msh288f263dcca14f1p1cd158jsn3480fbad9a13',
          'x-rapidapi-host': 'imdb-com.p.rapidapi.com'
        }
    }

    request(options, (error, response, body) => {
        if (error) {
            console.error('API Request Error:', error);
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
                };
            }) || [];
    
            if (movies.length > 0) {
                res.render('search', { movies, message: null });
            } else {
                res.render('search', { movies: [], message: 'No results found. Please try a different title.' });
            }
        } catch (parseError) {
            console.error('Response Parsing Error:', parseError);
            res.render('search', { movies: [], message: 'Error processing API response.' });
        }
    })    
})
module.exports = router; // Export the router
