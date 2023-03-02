const File = require('../../threads-observer-service/commons/File');
const DBUtils = require('./DBUtils');

/**
 * @typedef {Object} 
 * @property {Buffer} data
 * @property {string} extension
 */

class FileQueries {
    constructor(database) {
        this.database = database;
    };

    async createTable() {
        let sql = 
        `CREATE TABLE IF NOT EXISTS files (
            id            INTEGER PRIMARY KEY,
            post_id       INTEGER NOT NULL,
            list_index    INTEGER NOT NULL,
            url           TEXT NOT NULL,
            thumbnail_url TEXT NOT NULL,
            upload_name   TEXT NOT NULL,
            cdn_name      TEXT NOT NULL,
            check_sum     TEXT NOT NULL,
            is_deleted    INTEGER NOT NULL,
            extension     TEXT,
            data          BLOB,
            FOREIGN KEY (post_id)
                REFERENCES posts (id)
                ON DELETE CASCADE
                ON UPDATE NO ACTION
        );`;

        await DBUtils.wrapExecQuery(sql, this.database);
    };


    /**
     * 
     * @param {number} postId 
     * @returns {Promise.<File | null>}
     */
    async selectFirstFileOfPost(postId) {
        let sql = 
        `SELECT id, post_id, index, url, thumbnail_url, upload_name, cdn_name, check_sum, is_deleted
            FROM files WHERE post_id = ${postId} AND index = 1;`;
        
        let row = await DBUtils.wrapGetQuery(sql, [], this.database);
        if(row === null) return null;

        let file = new File(row.url, row.thumbnail_url, row.upload_name, row.cdn_name, row.check_sum, row.is_deleted);
        file.id = row.id;
        file.listIndex = row.list_index;
        return file;
    };

    /**
     * 
     * @param {number} postId
     * @returns {Array.<File>} 
     */
    async selectFilesOfPost(postId) {
        let sql = 
        `SELECT id, post_id, index, url, thumbnail_url, upload_name, cdn_name, check_sum, is_deleted
            FROM files WHERE post_id = ${postId};`;

        let rows = await DBUtils.wrapAllQuery(sql, [], this.database);

        let files = [];
        let file;
        let row;
        for(let i = 0; i < rows.length; i++) {
            row = rows[i];
            file = new File(row.url, row.thumbnail_url, row.upload_name, row.cdn_name, row.check_sum, row.is_deleted);
            file.id = row.id;
            file.listIndex = row.list_index;
            files.push(file);
        }

        return files;
    };
};

module.exports = FileQueries;