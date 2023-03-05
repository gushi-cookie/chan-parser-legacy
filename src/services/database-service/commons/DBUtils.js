/**
* Wrap a get query with a promise.
* @param {string} sql 
* @param {Array} param 
* @param {Database} db 
* @returns {Promise.<Object | null>}
* @throws {SQLiteError}
*/
const wrapGetQuery = async (sql, param, db) => {
    return new Promise((resolve, reject) => {
        db.get(sql, param, (error, row) => {
            if(error) {
                reject(error);
            } else if(row === undefined) {
                resolve(null);
            } else {
                resolve(row);
            }
        });
    });
};

/**
 * Wrap an exec query with a promise.
 * @param {string} sql 
 * @param {Database} db 
 * @throws {SQLiteError}
 */
const wrapExecQuery = async (sql, db) => {
    return new Promise((resolve, reject) => {
        db.exec(sql, (error) => {
            if(error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

/**
 * Wrap an all query with a promise.
 * @param {string} sql 
 * @param {Array} param 
 * @param {Database} db 
 * @returns {Promise.<Array>}
 * @throws {SQLiteError}
 */
const wrapAllQuery = async (sql, param, db) => {
    return new Promise((resolve, reject) => {
        db.all(sql, param, (error, rows) => {
            if(error) {
                reject(error);
            } else {
                resolve(rows);
            }
        });
    });
};

/**
 * Wrap a run query with a promise. This function returns
 * an object from the callback context (this).
 * 
 * For INSERT statement the context object is in this format:
 * { lastID: 8, changes: 1 }.
 * @param {string} sql 
 * @param {Array} param 
 * @param {Database} db 
 * @returns {Object}
 * @throws {SQLiteError}
 */
const wrapRunQuery = async (sql, param, db) => {
    return new Promise((resolve, reject) => {
        db.run(sql, param, function(error) {
            if(error) {
                reject(error);
            } else {
                resolve(this);
            }
        });
    });
};


/**
 * Convert string from snake case to camel case.
 * @param {string} str String to convert.
 * @returns {string}
 */
const snakeToCamelCase = (str) => {
    return str.toLowerCase().replace(/([-_][a-z])/g, (group) => {
        return group.toUpperCase().replace('-', '').replace('_', '');
    });
};

/**
 * Convert string from camel case to snake case.
 * @param {string} str String to convert.
 * @returns {string}
 */
const camelToSnakeCase = (str) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};


module.exports = {
    wrapGetQuery,
    wrapExecQuery,
    wrapAllQuery,
    wrapRunQuery,
    snakeToCamelCase,
    camelToSnakeCase,
};