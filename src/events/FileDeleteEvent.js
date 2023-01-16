const FileEvent = require('./FileEvent');

class FileDeleteEvent extends FileEvent {
    static name = 'file-delete';

    /**
     * @param {Thread} thread 
     * @param {Post} post 
     * @param {File} file 
     */
    constructor(thread, post, file) {
        super(thread, post, file);
    }
};

module.exports = FileDeleteEvent;