const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    const username = req.session.userId || null;
    res.render('index.ejs', { username });
});

router.get('/about', (req, res, next) => {
    res.render('about.ejs')
})

module.exports = router; // Export the `router`