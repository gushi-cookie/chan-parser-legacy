const express = require('express');
const serveIndex = require('serve-index');
const router = require('express').Router();
const cdnController = require('../controllers/cdn.controller');


const mediaPath = process.env.WEB_SERVICE_MEDIA_PATH;

// GET: /cdn/file/:id/file_cdn_name.extension
// Get a file from the database.
router.get('/cdn/file/:id(\\d+)/:file', cdnController.cdnFile);

// GET: /cdn/static
// Get a file that is stored in the file system. 
router.use('/cdn/static', express.static(mediaPath), serveIndex(mediaPath, {icons: true}));

// GET: /cdn/thumbnail/:id/file_cdn_name<_s>.png
// Get a thumbnail of a file.
router.use('/cdn/thumbnail/:id(\\d+)/:file', cdnController.cdnThumbnail);

module.exports = router;