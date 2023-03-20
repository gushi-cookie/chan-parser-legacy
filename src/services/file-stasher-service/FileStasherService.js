const fs = require('node:fs');
const fsp = require('node:fs/promises');
const child_process = require('node:child_process');
const sharp = require('sharp');
const crypto = require('node:crypto');
const Stream = require('node:stream');
const StreamPromise = require('node:stream/promises');
const EventEmitter = require('node:events');
const StashFile = require('./commons/StashFile');
const FileCreateEvent = require('../threads-observer-service/events/FileCreateEvent');
const FileDeleteEvent = require('../threads-observer-service/events/FileDeleteEvent');
const FileDBFetchEvent = require('../threads-observer-service/events/FileDBFetchEvent');
const ThreadCreateEvent = require('../threads-observer-service/events/ThreadCreateEvent');
const ThreadDeleteEvent = require('../threads-observer-service/events/ThreadDeleteEvent');


/**
 * Class represents a service with various modes for working with files.
 */
class FileStasherService extends EventEmitter {

    /**
     * Create an instance of the FileStasherService class.
     * @param {ThreadsObserverService} threadsObserverService Vital service.
     * @param {string} outputDir Path to a directory where to write StashFiles. No '/' in the end.
     * @param {number} suspiciousInterval Interval in milliseconds for the suspicious mode.
     * @param {import('winston').Logger} logger Winston's logger.
     */
    constructor(threadsObserverService, outputDir, suspiciousInterval, logger) {
        super();

        if(outputDir[outputDir.length-1] === '/') {
            outputDir = outputDir.slice(0, outputDir.length-1);
        }

        /** @type {import('../threads-observer-service/ThreadsObserverService')} */
        this.threadsObserverService = threadsObserverService;

        /** @type {import('../database-service/DatabaseService')} */
        this.database = null;

        /** @type {Array.<StashFile>} */ this.files = [];

        /** @type {string}  */ this.outputDir = outputDir;
        /** @type {number}  */ this.suspiciousInterval = suspiciousInterval;
        /** @type {Array.<Object>} */ this.suspiciousTimeouts = [];

        this.logger = logger;

        this.mode = null;
        this.stasherRunning = false;
        this.stasherDelay = 2000;

        this.fileCreateHandler = () => {};
        this.fileDeleteHandler = () => {};
        this.fileDBFetchHandler = () => {};
        this.threadDeleteHandler = () => {};
        this.threadCreateHandler = () => {};
    };



    // #############
    // Mode Controls
    // #############

    /**
     * Delay a current thread (current code execution).
     * @param {number} delay Delay in milliseconds.
     */
    async _wait(delay) {
        return new Promise((resolve) => { setTimeout(resolve, delay); });
    };

    /**
     * Create thumbnail from a image or a video, represented in a buffer.
     * @param {string} extension File extension of the buffer file.
     * @param {Buffer} buffer File data.
     * @returns {Promise.<Buffer>} Thumbnail in png format.
     * @throws {FSError} Occurs when fs errors happen.
     * @throws {SharpError} Thrown by Sharp library.
     * @throws {ExtensionError} Thrown if a passed extension is not supported.
     */
    async _createThumbnail(extension, buffer) {
        extension = extension.toLowerCase();

        let cachePath = '/dev/shm/.chan_parser';
        let supportedImageExts = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg', 'tiff'];
        let supportedVideoExts = ['mp4', 'm4p', 'mov', 'wmv', 'avi', 'mkv', 'webm', 'flv', 'vob', 'ogv', 'ogg'];

        if(supportedImageExts.includes(extension)) {
            return await sharp(buffer).resize({
                fit: sharp.fit.contain,
                width: 250,
            }).png().toBuffer();
        }

        if(!supportedVideoExts.includes(extension)) {
            throw new Error(`Extension '${extension}' is not supported.`);
        }

        let filename = crypto.randomBytes(20).toString('hex');
        await fsp.mkdir(cachePath, {recursive: true});
        await StreamPromise.pipeline(Stream.Readable.from(buffer), fs.createWriteStream(`${cachePath}/${filename}.${extension}`));
        child_process.execSync(`ffmpegthumbnailer -i ${filename}.${extension} -o ${filename}.png -s 250`, { cwd: cachePath });

        buffer = await new Promise((resolve, reject) => {
            let stream = fs.createReadStream(`${cachePath}/${filename}.png`);
            let chunks = [];
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('error', (error) => reject(error));
            stream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
        await fsp.rm(`${cachePath}/${filename}.${extension}`);
        await fsp.rm(`${cachePath}/${filename}.png`);
        return buffer;
    };

    /**
     * In this mode these happen:
     * - download all files and store them in the database.
     * - create thumbnails of media files and store them in the database.
     * - remove a file from the storage after all manipulations.
     */
    _webMode() {
        let fileCreateHandler = (/**@type {FileCreateEvent}*/ event) => {
            this.files.push(StashFile.makeFromObserverFile(event.file, this.outputDir, event.thread.number.toString()));
        };

        let fileDBFetchHandler = (/**@type {FileDBFetchEvent} */ event) => {
            if(event.storedFile.extension === null) {
                this.files.push(StashFile.makeFromObserverFile(event.file, this.outputDir, event.thread.number.toString()));
            }
        };

        let threadCreateHandler = (/**@type {ThreadCreateEvent}*/ event) => {
            event.thread.posts.forEach(post => {
                post.files.forEach(file => {
                    this.files.push(StashFile.makeFromObserverFile(file, this.outputDir, event.thread.number.toString()));
                });
            });
        };

        this.fileCreateHandler = fileCreateHandler;
        this.fileDBFetchHandler = fileDBFetchHandler;
        this.threadCreateHandler = threadCreateHandler;
        this.threadsObserverService.on(FileCreateEvent.name, fileCreateHandler);
        this.threadsObserverService.on(FileDBFetchEvent.name, fileDBFetchHandler);
        this.threadsObserverService.on(ThreadCreateEvent.name, threadCreateHandler);

        let web = async () => {
            let file = this.getFirstNotFetchedFile();
            if(file === null) return;
            
            let connResetOccurred = false;
            try {
                await file.fetchFile();
            } catch(error) {
                if(error.code === 'ECONNRESET') {
                    this.logger.error(`Error 'ECONNRESET' occurred. URL: ${file.url}. Second attempt to fetch the file.`);
                    this.logger.error(error);
                    connResetOccurred = true;
                } else {
                    this.logger.error(error);
                    this.files.splice(this.files.indexOf(file), 1);
                    return;
                }
            }

            if(connResetOccurred) {
                try {
                    await this._wait(this.stasherDelay);
                    await file.fetchFile();
                } catch(error) {
                    this.logger.error(`The second attempt of fetching the file has ended with error. URL: ${file.url}`);
                    this.logger.error(error);
                    this.files.splice(this.files.indexOf(file), 1);
                    return;
                }
            }
            
            if(file.notFound) {
                this.logger.warn(`Couldn't fetch file ${file.url} due to 404.`);
                this.files.splice(this.files.indexOf(file), 1);
                return;
            }

            try {
                let storedFile = await this.database.fileQueries.selectFileByUrl(file.url, ['data', 'thumbnail_data']);
                if(storedFile !== null && storedFile.extension === null) {
                    storedFile.extension = file.fileExtension;
                    storedFile.data = file.buffer;
                    storedFile.thumbnailData = await this._createThumbnail(file.fileExtension, file.buffer);
                    await this.database.fileQueries.updateFile(storedFile, ['extension', 'data', 'thumbnailData']);
                    this.logger.verbose(`Stored a new file: /cdn/file/${storedFile.id}/${storedFile.cdnName}.${storedFile.extension}`);
                } else {
                    this.logger.warn(`File '${file.fileName}' ${file.url} is either already stored in the database or not stored at all. Ignoring it.`);
                }
            } catch(error) {
                this.logger.error(error);
            }

            this.files.splice(this.files.indexOf(file), 1);
        };

        // Starter.
        let recursiveTimer = async () => {
            this.stasherRunning && await web();
            this.stasherRunning && await this._wait(this.stasherDelay);
            this.stasherRunning && recursiveTimer();
        };

        this.stasherRunning = true;
        setTimeout(recursiveTimer, this.stasherDelay);
        this.logger.info('Web timer has started.');
    };

    /**
     * In this mode these happen:
     * - download all files.
     * - write downloaded files to the output directory.
     * - remove written files from the storage.
     */
    _allInMode() {
        let fileCreateHandler = (/**@type {FileCreateEvent}*/ event) => {
            this.files.push(StashFile.makeFromObserverFile(event.file, this.outputDir, event.thread.number.toString()));
        };

        this.fileCreateHandler = fileCreateHandler;
        this.threadsObserverService.on(FileCreateEvent.name, fileCreateHandler);


        let allIn = async () => {
            let file = this.getFirstNotFetchedFile();
            if(file === null) return;
            
            let connResetOccurred = false;
            try {
                await file.fetchFile();
                if(file.notFound) {
                    this.logger.warn(`File ${file.fileName}.${file.extension} couldn't be fetched due to 404. ${file.url}`);
                } else {
                    this.logger.verbose(`Fetched a new file: ${file.fileName}.${file.extension}`);
                    await file.flush(true);
                }
            } catch(error) {
                if(error.code === 'ECONNRESET') {
                    this.logger.error(`Error 'ECONNRESET' occurred. URL: ${file.url}. Second attempt to fetch the file.`);
                    this.logger.error(error);
                    connResetOccurred = true;
                } else {
                    this.logger.error(error);
                    this.files.splice(this.files.indexOf(file), 1);
                    return;
                }
            }

            if(connResetOccurred) {
                try {
                    await this._wait(this.stasherDelay);
                    await file.fetchFile();
                    if(file.notFound) {
                        this.logger.warn(`File ${file.fileName}.${file.extension} couldn't be fetched due to 404. ${file.url}`);
                    } else {
                        this.logger.verbose(`Fetched a new file: ${file.fileName}.${file.extension}`);
                        await file.flush(true);
                    }
                } catch(error) {
                    this.logger.error(`The second attempt of fetching the file has ended with error. URL: ${file.url}`);
                    this.logger.error(error);
                }
            }

            this.files.splice(this.files.indexOf(file), 1);
        };

        // Starter.
        let recursiveTimer = async () => {
            this.stasherRunning && await allIn();
            this.stasherRunning && await this._wait(this.stasherDelay);
            this.stasherRunning && recursiveTimer();
        };

        this.stasherRunning = true;
        setTimeout(recursiveTimer, this.stasherDelay);
        this.logger.info('All-in timer has started.');
    };

    /**
     * In this mode these happen:
     * - download all new added files and store them in the memory.
     * - attach a timer to each stored file.
     * - if a file is deleted before its timer ends, then the file is written to the output directory.
     * - if a file is not deleted by the end of its timer, then the file is removed from the storage, without writing.
     */
    _suspiciousMode() {
        let fileCreateHandler = (/**@type {FileCreateEvent}*/ event) => {
            this.files.push(StashFile.makeFromObserverFile(event.file, this.outputDir, event.thread.number.toString()));
        };

        let fileDeleteHandler = async (/**@type {FileDeleteEvent}*/ event) => {
            let timeoutObj = this.getSuspiciousTimeoutByUrl(event.file.url);
            if(timeoutObj === null) return;

            clearTimeout(timeoutObj.timeout);
            await timeoutObj.file.flush(true);

            this.suspiciousTimeouts.splice(this.suspiciousTimeouts.indexOf(timeoutObj), 1);
            this.files.splice(this.files.indexOf(timeoutObj.file), 1);
        };

        let threadDeleteHandler = async (/**@type {ThreadDeleteEvent}*/ event) => {
            let timeoutObj;
            let threadFiles = event.thread.getFiles();
            for(let i = 0; i < threadFiles.length; i++) {
                timeoutObj = this.getSuspiciousTimeoutByUrl(threadFiles[i].url);
                if(timeoutObj === null) continue;

                clearTimeout(timeoutObj.timeout);
                await timeoutObj.file.flush(true);

                this.suspiciousTimeouts.splice(this.suspiciousTimeouts.indexOf(timeoutObj), 1);
                this.files.splice(this.files.indexOf(timeoutObj.file), 1);
            }
        };

        this.fileCreateHandler = fileCreateHandler;
        this.fileDeleteHandler = fileDeleteHandler;
        this.threadDeleteHandler = threadDeleteHandler;
        this.threadsObserverService.on(FileCreateEvent.name, fileCreateHandler);
        this.threadsObserverService.on(FileDeleteEvent.name, fileDeleteHandler);
        this.threadsObserverService.on(ThreadDeleteEvent.name, threadDeleteHandler);


        let suspicious = async () => {
            let file = this.getFirstNotFetchedFile();
            if(file === null) return;

            let connResetOccurred = false;
            try {
                await file.fetchFile();
            } catch(error) {
                if(error.code === 'ECONNRESET') {
                    this.logger.error(`Error 'ECONNRESET' occurred. URL: ${file.url}. Second attempt to fetch the file.`);
                    this.logger.error(error);
                    connResetOccurred = true;
                } else {
                    this.logger.error(error);
                    this.files.splice(this.files.indexOf(file), 1);
                    return;
                }
            }

            if(connResetOccurred) {
                try {
                    await this._wait(this.stasherDelay);
                    await file.fetchFile();
                } catch(error) {
                    this.logger.error(`The second attempt of fetching the file has ended with error. URL: ${file.url}`);
                    this.logger.error(error);
                    this.files.splice(this.files.indexOf(file), 1);
                    return;
                }
            }


            if(file.notFound) {
                this.logger.warn(`Couldn't fetch file ${file.url} due to 404.`);
                this.files.splice(this.files.indexOf(file), 1);
            } else {
                this.logger.verbose(`Fetched a new file: ${file.fileName}.${file.extension}. Combining it with a timer.`);
                let obj = {};
                obj.file = file;
                obj.timeout = setTimeout(() => {
                    this.files.splice(this.files.indexOf(file), 1);
                    this.suspiciousTimeouts.splice(this.suspiciousTimeouts.indexOf(obj), 1);
                }, this.suspiciousInterval);

                this.suspiciousTimeouts.push(obj);
            }
        };

        // Starter.
        let recursiveTimer = async () => {
            this.stasherRunning && await suspicious();
            this.stasherRunning && await this._wait(this.stasherDelay);
            this.stasherRunning && recursiveTimer();
        };

        this.stasherRunning = true;
        setTimeout(recursiveTimer, this.stasherDelay);
        this.logger.info('Suspicious timer has started.');
    };


    /**
     * Start the stasher service in a specific mode.
     * @param {string} mode available: slave, all-in, suspicious.
     */
    async startStasher(mode) {
        this.logger.info(`Starting service in ${mode} mode.`);
        
        if(!['web', 'all-in', 'suspicious'].includes(mode)) {
            throw new Error(`Mode: ${mode} is not supported.`);
        }

        this.database = process.database;
        this.mode = mode;
        this.logger.info(`Checking output directory.`);
        await this.checkOutputDir();
        

        if(mode === 'web') this._webMode();
        if(mode === 'all-in') this._allInMode();
        if(mode === 'suspicious') this._suspiciousMode();
    };

    /**
     * Stop the stasher service.
     */
    stopStasher() {
        this.logger.info('Stopping service.');
        if(this.mode === 'web') {
            this.stasherRunning = false;
            this.threadsObserverService.removeListener(FileCreateEvent.name, this.fileCreateHandler);
            this.threadsObserverService.removeListener(FileDBFetchEvent.name, this.fileDBFetchHandler);
            this.threadsObserverService.removeListener(ThreadCreateEvent.name, this.threadCreateHandler);
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

        this.database = null;
    };



    // #################
    // Storage Interface
    // #################

    /**
     * Get a first StashFile from the storage, that is not fetched.
     * @returns {StashFile | null}
     */
    getFirstNotFetchedFile() {
        for(let i = 0; i < this.files.length; i++) {
            if(!this.files[i].isFetched && !this.files[i].notFound) {
                return this.files[i];
            }
        }
        return null;
    };

    /**
     * Get a suspicious timeout object by url.
     * @param {string} url 
     * @returns {object | null}
     */
    getSuspiciousTimeoutByUrl(url) {
        for(let i = 0; i < this.suspiciousTimeouts.length; i++) {
            if(this.suspiciousTimeouts[i].file.url === url) {
                return this.suspiciousTimeouts[i];
            }
        }
        return null;
    };


    // #####################
    // File System Interface
    // #####################

    /**
     * Probe if the output path exists, and create a new one if no.
     */
    async checkOutputDir() {
        await fsp.mkdir(this.outputDir, {recursive: true});
    };
};

module.exports = FileStasherService;