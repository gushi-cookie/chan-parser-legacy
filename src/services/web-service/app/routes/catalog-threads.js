const router = require('express').Router();
const catalogThreadsController = require('../controllers/catalog-threads.controller');

// GET: /api/catalog-threads[?imageBoard board number] - api/catalog-threads.js
// If no parameters passed, then all stored threads will be in the response.
router.get('/api/catalog-threads', catalogThreadsController.catalogThreadsGetApi);

module.exports = router;