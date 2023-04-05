const router = require('express').Router();
const catalogThreadsController = require('../controllers/catalog-threads.controller');

// GET: /api/catalog-threads/:id
// Get a catalog thread by id.
router.get('/api/catalog-threads/:id(\\d+)', catalogThreadsController.catalogThreadsGetApi);

// GET: /api/catalog-threads[?imageBoard board]
// If no parameters passed, then all stored threads will be in the response.
router.get('/api/catalog-threads', catalogThreadsController.catalogThreadsGetApi);

// GET: /api/catalog-threads/boards[?imageBoard board]
// Get list of stored image boards and boards. Parameters may be omitted.
router.get('/api/catalog-threads/boards', catalogThreadsController.boardsListGetApi);

module.exports = router;