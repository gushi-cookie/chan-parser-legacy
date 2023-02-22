const fsp = require('node:fs/promises');
const EventEmitter = require('node:events');
const StashFile = require('./commons/StashFile');
const FileCreateEvent = require('../threads-observer-service/events/FileCreateEvent');
const FileDeleteEvent = require('../threads-observer-service/events/FileDeleteEvent');
const ThreadDeleteEvent = require('../threads-observer-service/events/ThreadDeleteEvent');

/**
 * @typedef {Object} StashPair
 * @property {StashFile} file
 * @property {StashFile} thumbnail
 */


/**
 * Class represents a service with various modes for working with files.
 */
class FileStasherService extends EventEmitter {

    /**
     * Create an instance of the FileStasherService class.
     * @param {ThreadsObserverService} threadsObserverService vital service.
     * @param {boolean} stashFreshFilesOnly should only new files to be stashed.
     * @param {string} outputDir path to a dir where to write StashFiles. No '/' in the end.
     * @param {boolean} stashThumbnails should service download thumbnails too.
     * @param {number} suspiciousInterval interval in milliseconds for the suspicious mode.
     */
    constructor(threadsObserverService, stashFreshFilesOnly, outputDir, stashThumbnails, suspiciousInterval) {
        super();

        if(outputDir[outputDir.length-1] === '/') {
            outputDir = outputDir.slice(0, outputDir.length-1);
        }

        /** @type {ThreadsObserverService} */ this.threadsObserverService = threadsObserverService;

        /** @type {Array.<StashPair>} */ this.pairsStorage = [];

        /** @type {boolean} */ this.stashFreshFilesOnly = stashFreshFilesOnly;
        /** @type {string}  */ this.outputDir = outputDir;
        /** @type {boolean} */ this.stashThumbnails = stashThumbnails;
        /** @type {number}  */ this.suspiciousInterval = suspiciousInterval;
        /** @type {Array.<Timeout>} */ this.suspiciousTimeouts = [];


        this.mode = null;
        this.stasherRunning = false;
        this.stasherDelay = 2000;

        this.fileCreateHandler = () => {};
        this.fileDeleteHandler = () => {};
        this.threadDeleteHandler = () => {};
    };



    // ############
    // Web Requests
    // ############

    /**
     * Try to fetch files of a first stash pair that is not fetched yet.
     * @param {boolean} flush flush the stash pair on succeed.
     * @returns {Promise.<StashPair | null>}
     * @throws {AxiosError}
     */
    async fetchNext(flush) {
        /** @type {StashPair} */
        let pair = this.getFirstNotFetchedPair();
        if(pair === null) return null;

        let result;
        if(this.stashThumbnails) {
            result = await pair.thumbnail.fetchFile();
            if(result !== 404 && flush) await pair.thumbnail.flush(true);
        }

        result = await pair.file.fetchFile();
        if(result !== 404 && flush) await pair.file.flush(true);

        return pair;
    };
    


    // #############
    // Mode Controls
    // #############

    /**
     * Start the stasher service in a specific mode.
     * @param {string} mode available: slave, all-in, suspicious.
     */
    async startStasher(mode) {
        if(!['slave', 'all-in', 'suspicious'].includes(mode)) {
            throw new Error(`Mode: ${mode} is not supported.`);
        }

        await this.checkOutputDir();


        let slaveMode = () => {

        };

        let allInMode = () => {
            let fileCreateHandler = (/**@type {FileCreateEvent}*/ event) => {
                this.pairsStorage.push(StashFile.makeFromFile(event.file, this.outputDir, event.thread.number.toString()));
            };

            this.fileCreateHandler = fileCreateHandler;
            this.threadsObserverService.on(FileCreateEvent.name, fileCreateHandler);
    
            // Starter.
            let recursiveTimer = async () => {
                try {
                    this.stasherRunning && await this.fetchNext(true);
                } catch(error) {
                    // TO-DO Log error
                    console.log(error);
                }
                this.stasherRunning && await (new Promise((resolve) => { setTimeout(resolve, this.stasherDelay); }));
                this.stasherRunning && recursiveTimer();
            };

            this.stasherRunning = true;
            setTimeout(recursiveTimer, this.stasherDelay);
        };

        let suspiciousMode = () => {
            let fileCreateHandler = (/**@type {FileCreateEvent}*/ event) => {
                this.pairsStorage.push(StashFile.makeFromFile(event.file, this.outputDir, event.thread.number.toString()));
            };

            let fileDeleteHandler = async (/**@type {FileDeleteEvent}*/ event) => {
                let timeoutObj = this.getSuspiciousTimeoutByFile(event.file);
                if(timeoutObj === null) return;

                clearTimeout(timeoutObj.timeout);
                await timeoutObj.pair.file.flush(true);
                if(this.stashThumbnails) await timeoutObj.pair.thumbnail.flush(true);

                this.suspiciousTimeouts.splice(this.suspiciousTimeouts.indexOf(timeoutObj), 1);
                this.pairsStorage.splice(this.pairsStorage.indexOf(timeoutObj.pair), 1);
            };

            let threadDeleteHandler = async (/**@type {ThreadDeleteEvent}*/ event) => {
                let timeoutObj;
                let threadFiles = event.thread.getFiles();
                for(let i = 0; i < threadFiles.length; i++) {
                    timeoutObj = this.getSuspiciousTimeoutByFile(threadFiles[i]);
                    if(timeoutObj === null) continue;

                    clearTimeout(timeoutObj.timeout);
                    await timeoutObj.pair.file.flush(true);
                    if(this.stashThumbnails) await timeoutObj.pair.thumbnail.flush(true);

                    this.suspiciousTimeouts.splice(this.suspiciousTimeouts.indexOf(timeoutObj), 1);
                    this.pairsStorage.splice(this.pairsStorage.indexOf(timeoutObj.pair), 1);
                }
            };

            this.fileCreateHandler = fileCreateHandler;
            this.fileDeleteHandler = fileDeleteHandler;
            this.threadDeleteHandler = threadDeleteHandler;
            this.threadsObserverService.on(FileCreateEvent.name, fileCreateHandler);
            this.threadsObserverService.on(FileDeleteEvent.name, fileDeleteHandler);
            this.threadsObserverService.on(ThreadDeleteEvent.name, threadDeleteHandler);

    
            let afterFetchNext = (pair) => {
                if(pair === null) return;

                if(pair.file.notFound) {
                    this.pairsStorage.splice(this.pairsStorage.indexOf(pair), 1);
                } else {
                    let obj = {};
                    obj.pair = pair;
                    obj.timeout = setTimeout(() => {
                        this.pairsStorage.splice(this.pairsStorage.indexOf(pair), 1);
                    }, this.suspiciousInterval);

                    this.suspiciousTimeouts.push(obj);
                }
            };
    
            // Starter.
            let recursiveTimer = async () => {
                if(!this.stasherRunning) return;
                try {
                    let result = await this.fetchNext(false);
                    afterFetchNext(result);
                } catch(error) {
                    // TO-DO Log error
                    console.log(error);
                }
                this.stasherRunning && await (new Promise((resolve) => { setTimeout(resolve, this.stasherDelay); }));
                this.stasherRunning && recursiveTimer();
            };

            this.stasherRunning = true;
            setTimeout(recursiveTimer, this.stasherDelay);
        };

        if(mode === 'slave') slaveMode();
        if(mode === 'all-in') allInMode();
        if(mode === 'suspicious') suspiciousMode();
    };


    /**
     * Stop the stasher service.
     */
    stopStasher() {
        if(this.mode === 'slave') {

        } else if(this.mode === 'all-in') {
            this.stasherRunning = false;
            this.threadsObserverService.removeListener(FileCreateEvent.name, this.fileCreateHandler);
        } else if(this.mode === 'suspicious') {
            this.stasherRunning = false;
            this.threadsObserverService.removeListener(FileCreateEvent.name, this.fileCreateHandler);
            this.threadsObserverService.removeListener(FileDeleteEvent.name, this.fileDeleteEvent);
            this.ThreadsObserverService.removeListener(ThreadDeleteEvent.name, this.threadDeleteHandler);

            this.suspiciousTimeouts.forEach((timeoutObj) => {
                clearTimeout(timeoutObj.timeout);
            });
        }
    };



    // #######################
    // Pairs Storage Interface
    // #######################

    /**
     * Get the first StashPair with a file that is not fetched.
     * @returns {StashPair | null}
     */
    getFirstNotFetchedPair() {
        for(let i = 0; i < this.pairsStorage.length; i++) {
            if(!this.pairsStorage[i].file.isFetched && !this.pairsStorage[i].file.notFound) {
                return this.pairsStorage[i];
            }
        }
        return null;
    };

    /**
     * Get suspicious timeout object by file.
     * @param {File} file 
     * @returns {Object | null}
     */
    getSuspiciousTimeoutByFile(file) {
        for(let i = 0; i < this.suspiciousTimeouts.length; i++) {
            if(this.suspiciousTimeouts[i].pair.file.url === file.url) {
                return this.suspiciousTimeouts[i];
            }
        }
        return null;
    };


    // #####################
    // File System Interface
    // #####################

    /**
     * 
     */
    async checkOutputDir() {
        await fsp.mkdir(this.outputDir, {recursive: true});
    };
};

module.exports = FileStasherService;