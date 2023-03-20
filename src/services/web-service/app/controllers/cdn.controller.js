const mime = require('mime-types');
const Stream = require('node:stream');


/** @type {import('../../../database-service/DatabaseService')} */
const database = process.database;

/** @type {import('winston').Logger} */
const logger = process.webLogger;


const cdnFile = async (req, res) => {
    let file;
    try {
        file = await database.fileQueries.selectFileById(req.params.id, ['thumbnail_data']);
    } catch(error) {
        logger.error(error);
        res.status(500).send('Database error has occurred, while working on the request! 500');
        return;
    }

    let nameExt = req.params.file.split('.');

    if(file === null || file.data === null || nameExt.length < 2 || file.cdnName !== nameExt[0] || file.extension !== nameExt[1]) {
        res.status(404).send('File not found! 404');
    } else {
        res.setHeader('content-type', mime.contentType(file.extension));
        Stream.Readable.from(file.data).pipe(res);
    }
};

const cdnThumbnail = async (req, res) => {
    // GET: /cdn/thumbnail/:id/file_cdn_name<_s>.png

    let nameExt = req.params.file.split('.');
    if(nameExt.length < 2 || !nameExt[0].endsWith('_s') || nameExt[1] !== 'png') {
        res.status(404).send('File not found! 404');
        return;
    }

    let file;
    try {
        file = await database.fileQueries.selectFileById(req.params.id, ['data']);
    } catch(error) {
        logger.error(error);
        res.status(500).send('Database error has occurred, while working on the request! 500');
        return;
    }


    if(file === null || file.thumbnailData === null || file.cdnName !== nameExt[0].slice(0, nameExt[0].length - 2)) {
        res.status(404).send('File not found! 404');
    } else {
        res.setHeader('content-type', mime.contentType('png'));
        Stream.Readable.from(file.thumbnailData).pipe(res);
    }
};


module.exports = {
    cdnFile,
    cdnThumbnail,
};