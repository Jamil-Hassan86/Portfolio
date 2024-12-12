const express = require('express');
const router = express.Router();

//Home page
router.get('/', (req, res, next) => {
    const username = req.session.userId || null;
    const alertMessage = req.query.alert;
    res.render('index.ejs', { username, alert: alertMessage });
});

//About page
router.get('/about', (req, res, next) => {
    res.render('about.ejs')
})

module.exports = router; // Export the `router`