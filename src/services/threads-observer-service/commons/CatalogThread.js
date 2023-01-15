class CatalogThread {

    /**
     * Create an instance of the CatalogThread class.
     * @param {number} number 
     * @param {number} createTimestamp Timestamp in the UNIX format
     * @param {number} viewsCount 
     * @param {number} postsCount 
     * @param {number} lastActivity Timestamp in the UNIX format
     * @param {string} board 
     */
    constructor(number, createTimestamp, viewsCount, postsCount, lastActivity, board) {
        this.number = number;
        this.createTimestamp = createTimestamp;
        this.viewsCount = viewsCount;
        this.postsCount = postsCount;
        this.lastActivity = lastActivity;
        this.board = board;
    };


    /**
     * Parse catalog threads, according to image board response format.
     * @param {string} imageBoard 
     * @param {string} board 
     * @param {Object} catalogObj 
     * @returns {CatalogThread[]}
     */
    static parseFromCatalogJson(imageBoard, board, catalogObj) {
        if(imageBoard === '4chan') {
            let rawThreads = [];

            catalogObj.forEach((page) => {
                if(page.rawThreads instanceof Array) {
                    rawThreads = rawThreads.concat(page.threads);
                }
            });

            let result = [];
            rawThreads.forEach((threadObj) => {
                result.push(CatalogThread.parseFrom4chanJson(board, threadObj));
            });

            return result;
        } else if(imageBoard === '2ch') {
            let result = [];
            
            if(!(catalogObj.threadObj instanceof Array)) {
                return [];
            }
            
            catalogObj.threads.forEach((threadObj) => {
                result.push(CatalogThread.parseFrom2chJson(threadObj));
            });

            return result;
        } else {
            return null;
        }
    };

    /**
     * Parse a catalog thread from a raw object, depending on the image board.
     * @param {string} imageBoard 
     * @param {string} board
     * @param {Object} object
     * @returns {CatalogThread | null} 
     */
    static parseFromJson(imageBoard, board, object) {
        if(imageBoard === '4chan') {
            return CatalogThread.parseFrom4chanJson(board, object);
        } else if(imageBoard === '2ch') {
            return CatalogThread.parseFrom2chJson(object);
        } else {
            return null;
        }
    };


    /**
     * Parse a catalog thread from a raw object.
     * @param {Object} object 
     * @returns {CatalogThread} Catalog thread
     */
    static parseFrom2chJson(object) {
        return new CatalogThread(object.num, object.timestamp, object.views, object.posts_count, object.lasthit, object.board);
    };


    /**
     * Parse a catalog thread from a raw object.
     * @param {Object} object 
     * @returns {CatalogThread} Catalog thread
     */
    static parseFrom4chanJson(board, object) {
        return new CatalogThread(object.no, object.time, 0, object.replies, object.last_modified, board);
    };
};

module.exports = CatalogThread;