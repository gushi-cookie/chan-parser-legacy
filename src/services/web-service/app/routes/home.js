const router = require('express').Router();
const homeController = require('../controllers/home.controller');

// GET: /   - home.js
// Lists all stored threads in a one catalog.
router.get('/', homeController.homeView);

module.exports = router;