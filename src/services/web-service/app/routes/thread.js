const router = require('express').Router();
const threadController = require('../controllers/thread.controller');

// GET: /thread/:id
// Get a thread view by id.
router.get('/thread/:id(\\d+)', threadController.threadView);


// GET: /api/thread/:id
// Get a thread's data by id.
router.get('/api/thread/:id(\\d+)', threadController.threadGetApi);


// DELETE: /api/thread?[imageBoard, board, number]
// If no parameters passed, then all stored threads will be deleted.
// router.delete('/api/thread', threadController.threadDeleteApi);


module.exports = router;