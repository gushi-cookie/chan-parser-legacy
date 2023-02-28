const router = require('express').Router();
const threadsController = require('../controllers/threads.controller');

// GET: /threads[?imageBoard board number] - threads.js
// All parameters are required.
router.get('/threads', threadsController.threadsView);

// DELETE: /api/threads[?imageBoard board number] - api/threads.js
// If no parameters passed, then all stored threads will be deleted.
router.delete('/api/threads', threadsController.threadsDeleteApi);

module.exports = router;