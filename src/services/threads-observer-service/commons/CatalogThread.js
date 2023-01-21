class CatalogThread {

    /**
     * Create an instance of the CatalogThread class.
     * @param {number} number Thread id.
     * @param {number} createTimestamp Timestamp in the UNIX format.
     * @param {number} viewsCount Views count (may be 0).
     * @param {number} postsCount Posts count.
     * @param {number} lastActivity Timestamp when the last time the thread was modified (post add/mod/del; thread closed/sticky).
     * @param {string} board Board initials.
     * @param {string} name Op post name.
     * @param {string} title Op post title.
     * @param {string} comment Op post comment.
     * @param {string} imageBoard Image board name.
     */
    constructor(number, createTimestamp, viewsCount, postsCount, lastActivity, board, name, title, comment, imageBoard) {
        this.number = number;
        this.createTimestamp = createTimestamp;
        this.viewsCount = viewsCount;
        this.postsCount = postsCount;
        this.lastActivity = lastActivity;
        this.board = board;
        this.name = name;
        this.title = title;
        this.comment = comment;
        this.imageBoard = imageBoard;
    };


    /**
     * Parse catalog threads, according to image board response format.
     * @param {string} imageBoard 
     * @param {string} board 
     * @param {Object} catalogArray 
     * @returns {CatalogThread[]}
     */
    static parseFromCatalogJson(imageBoard, board, catalogArray) {
        if(imageBoard === '4chan') {
            let rawThreads = [];

            catalogArray.forEach((page) => {
                if(page.threads instanceof Array) {
                    rawThreads = rawThreads.concat(page.threads);
                }
            });

            let result = [];
            rawThreads.forEach((object) => {
                result.push(CatalogThread.parseFrom4chanJson(board, object));
            });

            return result;
        } else if(imageBoard === '2ch') {
            let result = [];
            
            if(!(catalogArray.threads instanceof Array)) {
                return [];
            }
            
            catalogArray.threads.forEach((threadObj) => {
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
     * @param {Object} object parsed object from the API.
     * @returns {CatalogThread} Catalog thread
     */
    static parseFrom2chJson(object) {
        if(typeof object.name !== 'string') {
            object.name = '';
        }
        if(typeof object.subject !== 'string') {
            object.subject = '';
        }
        if(typeof object.comment !== 'string') {
            object.comment = '';
        }
        return new CatalogThread(object.num, object.timestamp, object.views, object.posts_count, object.lasthit, object.board, object.name, object.subject, object.comment, '2ch');
    };


    /**
     * Parse a catalog thread from a raw object.
     * @param {String} board board initials.
     * @param {Object} object parsed object from the API.
     * @returns {CatalogThread} Catalog thread
     */
    static parseFrom4chanJson(board, object) {
        if(typeof object.name !== 'string') {
            object.name = '';
        }
        if(typeof object.sub !== 'string') {
            object.sub = '';
        }
        if(typeof object.com !== 'string') {
            object.com = '';
        }
        return new CatalogThread(object.no, object.time, 0, object.replies, object.last_modified, board, object.name, object.sub, object.com, '4chan');
    };
};

module.exports = CatalogThread;