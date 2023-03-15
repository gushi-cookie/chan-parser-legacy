const FileEvent = require('./FileEvent');

/**
 * Class represents data of both File and StoredFile instances.
 */
class FileDBFetchEvent extends FileEvent {
    static name = 'file-db-fetch';

    /**
     * Create an instance of the class.
     * @param {Thread} thread Thread associated with a file.
     * @param {Post} post Post associated with a file.
     * @param {File} file Observer file. 
     * @param {StoredFile} storedFile Database file.
     */
    constructor(thread, post, file, storedFile) {
        super(thread, post, file);
        this.storedFile = storedFile;
    };
};

module.exports = FileDBFetchEvent;