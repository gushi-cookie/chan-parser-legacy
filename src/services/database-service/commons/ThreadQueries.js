const DBUtils = require('./DBUtils');
const StoredThread = require('./StoredThread');
const FileQueries = require('./FileQueries');
const PostQueries = require('./PostQueries');


/**
 * Class represents queries for working with the threads table.
 */
class ThreadQueries {

    /**
     * Create an instance of the ThreadQueries class.
     * @param {Database} database 
     * @param {FileQueries} fileQueries 
     * @param {PostQueries} postQueries 
     */
    constructor(database, fileQueries, postQueries) {
        this.database = database;
        this.fileQueries = fileQueries;
        this.postQueries = postQueries;
    };


    /**
     * Create threads table if not exists, in the database.
     * @throws {SQLiteError}
     */
    async createTable() {
        let sql = 
        `CREATE TABLE IF NOT EXISTS threads (
            id               PRIMARY KEY,
            board            TEXT NOT NULL,
            image_board      TEXT NOT NULL,
            number           INTEGER NOT NULL,
            title            TEXT NOT NULL,
            posters_count    INTEGER NOT NULL,
            create_timestamp INTEGER NOT NULL,
            views_count      INTEGER NOT NULL,
            last_activity    INTEGER NOT NULL
        );`;

        await DBUtils.wrapExecQuery(sql, this.database);
    };

    /**
     * Select a specific thread.
     * 
     * Note: imageBoard and board are required.
     * @param {string} imageBoard 
     * @param {string} board 
     * @param {number} id 
     * @param {boolean} firstPostOnly 
     * @returns {Promise.<StoredThread | null>}
     * @throws {SQLiteError}
     */
    async selectThread(imageBoard, board, id) {
        let sql = `SELECT * FROM threads WHERE image_board = '${imageBoard}' AND board = '${board}' AND id = ${id};`;
        let row = await DBUtils.wrapGetQuery(sql, [], this.database);
        
        if(row !== null) {
            return StoredThread.makeFromTableRow(row);
        } else {
            return null;
        }
    };

    /**
     * Select all threads by a board conditions.
     * 
     * Note: imageBoard and board may be omitted (null) 
     * or only imageBoard passed or both imageBoard and 
     * board passed.
     * @param {string} imageBoard 
     * @param {string} board 
     * @returns {Promise.<StoredThread[]>}
     * @throws {SQLiteError}
     */
    async selectThreads(imageBoard, board) {
        let sql;
        if(imageBoard !== null && board !== null) {
            sql = `SELECT * FROM threads WHERE image_board = '${imageBoard}' AND board = '${board}';`;
        } else if(imageBoard !== null) {
            sql = `SELECT * FROM threads WHERE image_board = '${imageBoard}';`;
        } else {
            sql = `SELECT * FROM threads;`;
        }

        let rows = await DBUtils.wrapAllQuery(sql, [], this.database);

        let threads = [];
        for(let i = 0; i < rows.length; i++) {
            threads.push(StoredThread.makeFromTableRow(rows[i]));
        }
        return threads;
    };

    /**
     * Select a specific thread's tree, including its posts and files
     * excluding the data column from them.
     * @param {string} imageBoard 
     * @param {string} board 
     * @param {number} id 
     * @returns {Promise.<object | null>} {thread: StoredThread, posts: StoredPost[], files: StoredFiles[]}
     * @throws {SQLiteError}
     */
    async selectThreadTree(imageBoard, board, id) {
        let thread = await this.selectThread(imageBoard, board, id);
        if(thread === null) return null;

        let posts = await this.postQueries.selectPostsOfThread(thread.id);

        let postIDs = [];
        posts.forEach((post) => {
            postIDs.push(post.id);
        });
        let files = await this.fileQueries.selectFilesOfPosts(postIDs, false);

        return {
            thread,
            posts,
            files,
        }
    };
};

module.exports = ThreadQueries;