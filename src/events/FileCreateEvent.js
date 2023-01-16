const FileEvent = require('./FileEvent');

class FileCreateEvent extends FileEvent {
    static name = 'file-create';

    /**
     * @param {Thread} thread 
     * @param {Post} post 
     * @param {File} file 
     */
    constructor(thread, post, file) {
        super(thread, post, file);
    }
};

module.exports = FileCreateEvent;