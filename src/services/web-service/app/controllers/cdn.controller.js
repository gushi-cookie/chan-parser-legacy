const mime = require('mime-types');
const Stream = require('node:stream');


/** @type {import('../../../database-service/DatabaseService')} */
const database = process.database;


const cdnFile = async (req, res) => {
    let file;
    try {
        file = await database.fileQueries.selectFileById(req.params.id, ['data', 'thumbnail_data']);
    } catch(error) {
        console.log(error);
        res.status(500).send('Database error has occurred, while working on the request! 505');
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


module.exports = {
    cdnFile,
};