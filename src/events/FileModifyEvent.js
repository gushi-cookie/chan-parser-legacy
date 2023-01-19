const FileEvent = require('./FileEvent');

/**
 * Class representing file modification event data.
 */
class FileModifyEvent extends FileEvent {
    static name = 'file-modify';

    /**
     * Create an instance of the FileModifyEvent class.
     * @param {Thread} thread 
     * @param {Post} post 
     * @param {File} file 
     * @param {FilesDiff} filesDiff
     */
    constructor(thread, post, file, filesDiff) {
        super(thread, post, file);
        this.filesDiff = filesDiff;
    };
};

module.exports = FileModifyEvent;