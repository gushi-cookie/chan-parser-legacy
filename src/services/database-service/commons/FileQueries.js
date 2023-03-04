const StoredFile = require('../commons/StoredFile');
const DBUtils = require('./DBUtils');


/**
 * Class represents queries for working with the files table.
 */
class FileQueries {

    /**
     * Create an instance of the FileQueries class.
     * @param {Database} database 
     */
    constructor(database) {
        this.database = database;
    };


    /**
     * Create files table if not exists, in the database.
     * @throws {SQLiteError}
     */
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
     * Select the first file of a specific post, by its list_index column.
     * @param {number} postId Id of the post.
     * @param {boolean} includeData Should data column be included.
     * @returns {Promise.<StoredFile | null>}
     * @throws {SQLiteError}
     */
    async selectFirstFileOfPost(postId, includeData) {
        let sql;
        if(includeData) {
            sql = 
            `SELECT * FROM files WHERE post_id = ${postId} AND list_index = 1;`;
        } else {
            sql = 
            `SELECT id, post_id, index, url, thumbnail_url, upload_name, cdn_name, check_sum, is_deleted, extension
                FROM files WHERE post_id = ${postId} AND list_index = 1;`;
        }
        
        let row = await DBUtils.wrapGetQuery(sql, [], this.database);
        if(row !== null) {
            return StoredFile.makeFromTableRow(row);
        } else {
            return null;
        }
    };

    /**
     * Select all files of a specific post.
     * @param {number} postId Id of the post.
     * @param {boolean} includeData Should data column be included.
     * @returns {Promise<StoredFile[]>} 
     * @throws {SQLiteError}
     */
    async selectFilesOfPost(postId, includeData) {
        let sql;
        if(includeData) {
            sql =
            `SELECT * FROM files WHERE post_id = ${postId};`;
        } else {
            sql =
            `SELECT id, post_id, index, url, thumbnail_url, upload_name, cdn_name, check_sum, is_deleted, extension
                FROM files WHERE post_id = ${postId};`;
        }
        
        let rows = await DBUtils.wrapAllQuery(sql, [], this.database);
        let files = [];
        for(let i = 0; i < rows.length; i++) {
            files.push(StoredFile.makeFromTableRow(rows[i]));
        }
        return files;
    };

    /**
     * Select all files of specific posts.
     * @param {number[]} postIDs Ids of posts.
     * @param {boolean} includeData Should data column be included.
     * @returns {Promise.<StoredFile[]>}
     * @throws {SQLiteError}
     */
    async selectFilesOfPosts(postIDs, includeData) {
        if(postIDs.length === 0) return [];

        let ids = '';
        postIDs.forEach((id) => {
            ids += `${id},`;
        });
        ids = `(${ids.slice(0, ids.length - 1)})`;

        let sql;
        if(includeData) {
            sql = 
            `SELECT * FROM files WHERE id IN ${ids};`;
        } else {
            sql = 
            `SELECT id, post_id, index, url, thumbnail_url, upload_name, cdn_name, check_sum, is_deleted, extension
                FROM files WHERE id IN ${ids};`;
        }

        let rows = await DBUtils.wrapAllQuery(sql, [], this.database);

        let files = [];
        for(let i = 0; i < rows.length; i++) {
            files.push(StoredFile.makeFromTableRow(rows[i]));
        }
        return files;
    };
};

module.exports = FileQueries;