const FileEvent = require('./FileEvent');

class FileDiffEvent extends FileEvent {
    static name = 'file-diff';

    /**
     * @param {Thread} thread 
     * @param {Post} post 
     * @param {File} file 
     * @param {FilesDiff} filesDiff
     */
    constructor(thread, post, file, filesDiff) {
        super(thread, post, file);
        this.filesDiff = filesDiff;
    }
};

module.exports = FileDiffEvent;