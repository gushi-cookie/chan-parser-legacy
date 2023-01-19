const FileEvent = require('./FileEvent');

/**
 * Class representing file deletion event data.
 */
class FileDeleteEvent extends FileEvent {
    static name = 'file-delete';

    /**
     * Create an instance of the FileDeleteEvent class.
     * @param {Thread} thread 
     * @param {Post} post 
     * @param {File} file 
     */
    constructor(thread, post, file) {
        super(thread, post, file);
    };
};

module.exports = FileDeleteEvent;