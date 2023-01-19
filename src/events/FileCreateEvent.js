const FileEvent = require('./FileEvent');

/**
 * Class representing file creation event data.
 */
class FileCreateEvent extends FileEvent {
    static name = 'file-create';

    /**
     * Create an instance of the FileCreateEvent class.
     * @param {Thread} thread 
     * @param {Post} post 
     * @param {File} file 
     */
    constructor(thread, post, file) {
        super(thread, post, file);
    };
};

module.exports = FileCreateEvent;