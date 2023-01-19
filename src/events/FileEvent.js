/**
 * Base class for the file events.
 */
class FileEvent {

    /**
     * Create an instance of the FileEvent class.
     * @param {Thread} thread 
     * @param {Post} post 
     * @param {File} file 
     */
    constructor(thread, post, file) {
        this.thread = thread;
        this.post = post;
        this.file = file;
    };
};

module.exports = FileEvent;