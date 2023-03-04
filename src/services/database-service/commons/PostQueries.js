const DBUtils = require('./DBUtils');
const StoredPost = require('./StoredPost');
const FileQueries = require('./FileQueries');


/**
 * Class represents queries for working with the posts table.
 */
class PostQueries {

    /**
     * Create an instance of the PostQueries class.
     * @param {Database} database 
     * @param {FileQueries} fileQueries 
     * @throws {SQLiteError}
     */
    constructor(database, fileQueries) {
        this.database = database;
        this.fileQueries = fileQueries;
    };


    /**
     * Create files table if not exists, in the database.
     * @throws {SQLiteError}
     */
    async createTable() {
        let sql = 
        `CREATE TABLE IF NOT EXISTS posts (
            id               PRIMARY KEY,
            thread_id        INTEGER NOT NULL,
            number           INTEGER NOT NULL,
            list_index       INTEGER NOT NULL,
            create_timestamp INTEGER NOT NULL,
            name             TEXT NOT NULL,
            comment          TEXT NOT NULL,
            is_banned        INTEGER NOT NULL,
            is_deleted       INTEGER NOT NULL,
            is_op            INTEGER NOT NULL,
            FOREIGN KEY (thread_id)
                REFERENCES threads (id)
                ON DELETE CASCADE
                ON UPDATE NO ACTION
        );`;

        await DBUtils.wrapExecQuery(sql, this.database);
    };

    /**
     * Select the first post of a specific thread.
     * @param {number} threadId 
     * @returns {Promise.<StoredPost | null>}
     * @throws {SQLiteError}
     */
    async selectFirstPostOfThread(threadId) {
        let sql = `SELECT * FROM posts WHERE thread_id = ${threadId} AND index = 1;`;
        let row = await DBUtils.wrapGetQuery(sql, [], this.database);

        if(row !== null) {
            return StoredPost.makeFromTableRow(row);
        } else {
            return null;
        }
    };

    /**
     * Select all posts of a specific thread.
     * @param {number} threadId 
     * @returns {Promise.<StoredPost[]>}
     * @throws {SQLiteError}
     */
    async selectPostsOfThread(threadId) {
        let sql = `SELECT * FROM posts WHERE thread_id = ${threadId};`;
        let rows = await DBUtils.wrapAllQuery(sql, [], this.database);

        let posts = [];
        for(let i = 0; i < rows.length; i++) {
            posts.push(StoredPost.makeFromTableRow(rows[i]));
        }
        return posts;
    };
};

module.exports = PostQueries;