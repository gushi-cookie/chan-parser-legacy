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
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            board            TEXT NOT NULL,
            image_board      TEXT NOT NULL,
            number           INTEGER NOT NULL,
            title            TEXT NOT NULL,
            posters_count    INTEGER NOT NULL,
            create_timestamp INTEGER NOT NULL,
            views_count      INTEGER NOT NULL,
            last_activity    INTEGER NOT NULL,
            is_deleted       INTEGER NOT NULL,
            posts_count      INTEGER NOT NULL,
            files_count      INTEGER NOT NULL
        );`;

        await DBUtils.wrapExecQuery(sql, this.database);
    };


    /**
     * Get a list of stored image boards and boards.
     * @param {string} imageBoard nullable
     * @param {string} board nullable
     * @returns {Promise.<object>} {imageBoard: {board: {threadsCount, postsCount, filesCount}},}
     * @throws {SQLiteError}
     */
    async selectBoards(imageBoard, board) {
        let sql = 
        `SELECT DISTINCT image_board, board FROM threads
            ${(imageBoard || board) ? ' WHERE' : ''}
            ${imageBoard ? ' AND image_board = \'' + imageBoard + '\'' : ''}
            ${board ? ' AND board = \'' + board + '\'' : ''}
        ;`
        sql = sql.replace('AND', '');
        let boardRows = await DBUtils.wrapAllQuery(sql, [], this.database);
    
        let result = {};
        let row;
        for(let i = 0; i < boardRows.length; i++) {
            imageBoard = boardRows[i].image_board;
            board = boardRows[i].board;

            if(!result[imageBoard]) {
                result[imageBoard] = {};
            }
            result[imageBoard][board] = {};

            row = await DBUtils.wrapGetQuery(`SELECT COUNT(*) as threads, SUM(posts_count) as posts, SUM(files_count) files FROM threads WHERE image_board = ? AND board = ?;`, [imageBoard, board], this.database);
            result[imageBoard][board].threadsCount = row.threads;
            result[imageBoard][board].postsCount = row.posts;
            result[imageBoard][board].filesCount = row.files;
        };

        return result;
    };


    /**
     * Select a specific thread.
     * @param {number} id 
     * @param {boolean} firstPostOnly 
     * @returns {Promise.<StoredThread | null>}
     * @throws {SQLiteError}
     */
    async selectThread(id) {
        let sql = `SELECT * FROM threads WHERE id = ${id};`;
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
     * Note: imageBoard and board may be omitted (null).
     * @param {string} imageBoard 
     * @param {string} board 
     * @param {string} includeDeleted Should deleted threads be in the result.
     * @returns {Promise.<StoredThread[]>}
     * @throws {SQLiteError}
     */
    async selectThreads(imageBoard, board, includeDeleted) {
        let sql =
        `SELECT * FROM threads
            ${(imageBoard || board || !includeDeleted) ? ' WHERE' : ''}
            ${imageBoard ? ' AND image_board = \'' + imageBoard + '\'' : ''}
            ${board ? ' AND board = \'' + board + '\'' : ''}
            ${!includeDeleted ? ' AND is_deleted = 0' : ''}
        ;`;
        sql = sql.replace('AND', '');

        let rows = await DBUtils.wrapAllQuery(sql, [], this.database);

        let threads = [];
        for(let i = 0; i < rows.length; i++) {
            threads.push(StoredThread.makeFromTableRow(rows[i]));
        }
        return threads;
    };

    /**
     * Select a specific thread's tree, including its posts and files, and
     * excluding the data column from them.
     * @param {number} id 
     * @returns {Promise.<object | null>} {thread: StoredThread, posts: StoredPost[], files: StoredFiles[]}
     * @throws {SQLiteError}
     */
    async selectThreadTree(id) {
        let thread = await this.selectThread(id);
        if(thread === null) return null;

        let posts = await this.postQueries.selectPostsOfThread(thread.id);

        let postIDs = [];
        posts.forEach((post) => {
            postIDs.push(post.id);
        });
        let files = await this.fileQueries.selectFilesOfPosts(postIDs, ['data', 'thumbnail_data']);

        return {
            thread,
            posts,
            files,
        }
    };


    /**
     * Insert a thread in the threads table.
     * 
     * Note: id property of the thread may be null.
     * @param {StoredThread} thread Thread to be inserted.
     * @returns {Promise.<number>} Id of the inserted thread.
     * @throws {SQLiteError}
     */
    async insertThread(thread) {
        let sql =
        `INSERT INTO threads(id, board, image_board, number, title, posters_count, create_timestamp, views_count, last_activity, is_deleted, posts_count, files_count)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        let result = await DBUtils.wrapRunQuery(sql, [thread.id, thread.board, thread.imageBoard, thread.number, thread.title, thread.postersCount, thread.createTimestamp, thread.viewsCount, thread.lastActivity, thread.isDeleted, thread.postsCount, thread.filesCount], this.database);
        return result.lastID;
    };


    /**
     * Update columns of a stored thread in the threads table.
     * 
     * Note: id property shouldn't be null.
     * @param {StoredThread} thread Thread to be updated.
     * @param {String[]} fields Names of the StoredThread class's fields to update.
     * @throws {SQLiteError}
     */
    async updateThread(thread, fields) {
        let sets = '';
        fields.forEach((field) => {
            sets += `${StoredThread.convertFieldToSnakeCase(field)} = ?,`;
        });
        sets = sets.slice(0, sets.length - 1);

        let sql = `UPDATE threads SET ${sets} WHERE id = ${thread.id};`;

        let params = [];
        fields.forEach((field) => {
            params.push(thread[field]);
        });

        await DBUtils.wrapRunQuery(sql, params, this.database);
    };
};

module.exports = ThreadQueries;