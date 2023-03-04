const sqlite3 = require('sqlite3');
const FileQueries = require('./commons/FileQueries');
const PostQueries = require('./commons/PostQueries');
const ThreadQueries = require('./commons/ThreadQueries');
const DBUtils = require('./commons/DBUtils');

/**
 * Class represents a service that works with SQLite3 database.
 */
class DatabaseService {

    /**
     * Create an instance of the DatabaseService class.
     */
    constructor() {
        this.database = null;

        this.fileQueries = null;
        this.postQueries = null;
        this.threadQueries = null;
    };

    /**
     * Start the database.
     * @throws {SQLiteError}
     */
    async startDatabase() {
        await new Promise((resolve) => {
            this.database = new sqlite3.Database(`${process.env.OUTPUT_PATH}/result.db`,
            (error) => {
                if(error) throw error;
                console.log('Successfully connected to the database.');
                resolve();
            });
        });

        await DBUtils.wrapExecQuery(`PRAGMA foreign_keys = ON;`, this.database);

        this.fileQueries = new FileQueries(this.database);
        this.postQueries = new PostQueries(this.database, this.fileQueries);
        this.threadQueries = new ThreadQueries(this.database, this.fileQueries, this.postQueries);

        await this.threadQueries.createTable();
        await this.postQueries.createTable();
        await this.fileQueries.createTable();
    };

    /**
     * Stop the database.
     * @throws {SQLiteError}
     */
    async stopDatabase() {
        await new Promise((resolve) => {
            this.database.close((error) => {
                if(error) throw error;
                console.log('Database connection closed.');
                resolve();
            });
        });
    };
};

module.exports = DatabaseService;