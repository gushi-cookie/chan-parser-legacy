const fs = require('fs').promises;
const axios = require('axios');
const StashFile = require('./commons/StashFile');
const EventEmitter = require('events');
const FileCreateEvent = require('../threads-observer-service/events/FileCreateEvent');
const FileDeleteEvent = require('../threads-observer-service/events/FileDeleteEvent');

class FileStasherService extends EventEmitter {

    /**
     * 
     * @param {ThreadsObserverService} threadsObserverService 
     * @param {boolean} stashFreshFilesOnly 
     * @param {string} outputDir 
     */
    constructor(threadsObserverService, stashFreshFilesOnly, outputDir, stashThumbnails) {
        super();

        if(outputDir[outputDir.length-1] === '/') {
            outputDir = outputDir.slice(0, outputDir.length-1);
        }

        this.threadsObserverService = threadsObserverService;

        this.stashFilePairs = [];

        this.stashFreshFilesOnly = stashFreshFilesOnly;
        this.outputDir = outputDir;
        this.stashThumbnails = stashThumbnails;

        this.stasherRunning = false;
        this.stasherDelay = 2000;

        this.fileCreateHandler = () => {};
        this.fileDeleteHandler = () => {};
    };

    /**
     * @returns {Object | null}
     */
    getFirstNotDownloadedPair() {
        for(let i = 0; i < this.stashFilePairs.length; i++) {
            if(!this.stashFilePairs[i].file.downloaded) {
                return this.stashFilePairs[i];
            }
        }

        return null;
    };

    /**
     * Create directories path from outputDir.
     */
    async checkOutputDir() {
        await fs.mkdir(this.outputDir, {recursive: true}, (error) => {
            throw error;
        });
    };

    async startStasher() {
        let fileCreateHandler = (/**@type {FileCreateEvent}*/ event) => {
            this.stashFilePairs.push(StashFile.makeFromFile(event.file, this.outputDir, null));
        };

        let fileDeleteHandler = (/**@type {FileDeleteEvent}*/ event) => {

        };
        
        await this.checkOutputDir();
        this.fileCreateHandler = fileCreateHandler;
        this.fileDeleteHandler = fileDeleteHandler;
        this.threadsObserverService.on(FileCreateEvent.name, fileCreateHandler);
        this.threadsObserverService.on(FileDeleteEvent.name, fileDeleteHandler);


        let stash = async () => {
            let pair = this.getFirstNotDownloadedPair();
            if(pair === null) return;

            
            let
            /** @type {StashFile} */ file = pair.file, 
            /** @type {StashFile} */ thumbnail = pair.thumbnail;
            try {
                await file.downloadFile();
                if(this.stashThumbnails) await thumbnail.downloadFile();

                await file.flush(true);
                if(this.stashThumbnails) await thumbnail.flush(true);
            } catch(error) {
                console.log(error);
            }
        };

        let recursiveTimer = async () => {
            this.stasherRunning && await stash();
            this.stasherRunning && await (new Promise((resolve) => { setTimeout(resolve, this.stasherDelay); }));
            this.stasherRunning && recursiveTimer();
        };

        // Starter.
        this.stasherRunning = true;
        setTimeout(recursiveTimer, this.stasherDelay);
    };

    async stopStasher() {
        this.stasherRunning = false;
        this.threadsObserverService.on(FileCreateEvent.name, this.fileCreateHandler);
        this.threadsObserverService.on(FileDeleteEvent.name, this.fileDeleteHandler);
    };
};

module.exports = FileStasherService;