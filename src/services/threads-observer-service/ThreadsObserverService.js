const axios = require('axios');
const Thread = require('./commons/Thread');
const CatalogThread = require('./commons/CatalogThread');
const EventEmitter = require('events');

const ThreadCreateEvent = require('./events/ThreadCreateEvent');
const ThreadDeleteEvent = require('./events/ThreadDeleteEvent');
const ThreadModifyEvent = require('./events/ThreadModifyEvent');
const ThreadNotFoundEvent = require('./events/ThreadNotFoundEvent');
const PostCreateEvent = require('./events/PostCreateEvent');
const PostDeleteEvent = require('./events/PostDeleteEvent');
const PostModifyEvent = require('./events/PostModifyEvent');
const PostReplyEvent = require('./events/PostReplyEvent');
const FileCreateEvent = require('./events/FileCreateEvent');
const FileDeleteEvent = require('./events/FileDeleteEvent');
const FileModifyEvent = require('./events/FileModifyEvent');



/**
 * Class representing catalog and thread observers with event callbacks.
 */
class ThreadsObserverService extends EventEmitter {
    /**
     * Create an instance of the ThreadsObserverService class.
     */
    constructor() {
        super();
        this.threads = [];

        this.catalogWhitelist = [];
        this.catalogWhitelistEnabled = false;

        this.catalogObserverRunning = false;
        this.catalogObserverDelay = 2500;
        this.threadFetchDelay = 500;

        this.imageBoard = '2ch';
        this.board = 'b';
    };



    // #########################
    // Threads storage interface
    // #########################

    /**
     * Search for a stored thread with same number.
     * @param {number} number 
     * @returns {Thread | null}
     */
    getThread(number) {
        for(let i = 0; i < this.threads.length; i++) {
            if(this.threads[i].number === number) {
                return this.threads[i];
            }
        }
        return null;
    };



    // ############
    // Api requests
    // ############

    /**
     * Form an url for requesting a thread.
     * @param {string} imageBoard
     * @param {string} board
     * @param {number} threadNumber 
     * @returns {string | null} String url
     */
    static formThreadUrl(imageBoard, board, threadNumber) {
        if(imageBoard === '4chan') {
            return `https://a.4cdn.org/${board}/thread/${threadNumber}.json`;
        } else if(imageBoard === '2ch') {
            return `https://2ch.hk/${board}/res/${threadNumber}.json`;
        } else {
            return null;
        }
    };


    /**
     * Form an url for requesting a catalog.
     * @param {string} imageBoard
     * @param {string} board 
     * @returns {string | null} String url
     */
    static formCatalogUrl(imageBoard, board) {
        if(imageBoard === '4chan') {
            return `https://a.4cdn.org/${board}/catalog.json`;
        } else if(imageBoard === '2ch') {
            return `https://2ch.hk/${board}/catalog.json`;
        } else {
            return null;
        }
    };


    /**
     * Request catalog threads for a specific board.
     * @param {string} imageBoard
     * @param {string} board 
     * @returns {Promise.<CatalogThread[] | number>} Catalog threads array or 404.
     * @throws {AxiosError | SyntaxError}
     */
    static async fetchCatalog(imageBoard, board) {
        let url = ThreadsObserverService.formCatalogUrl(imageBoard, board);

        let res;
        try {
            res = await axios.get(url);
        } catch(error) {
            if(error.response && error.response.status === 404) {
                return 404;
            } else {
                throw error;
            }
        }

        if((typeof res.headers['content-type'] === 'string') && res.headers['content-type'].includes('application/json')) {
            return CatalogThread.parseFromCatalogJson(imageBoard, board, res.data);
        } else {
            let error = new Error('Response content-type header is not set or not equal to application/json.');
            error.response = res;
            throw error;
        }
    };


    /**
     * Request for a specific thread.
     * @param {string} imageBoard
     * @param {string} board
     * @param {number} number 
     * @returns {Promise.<Thread | number>} Fetched thread or 404.
     * @throws {AxiosError | SyntaxError}
     */
    static async fetchThread(imageBoard, board, number) {
        let url = ThreadsObserverService.formThreadUrl(imageBoard, board, number);

        let res;
        try {
            res = await axios.get(url);
        } catch(error) {
            if(error.response && error.response.status === 404) {
                return 404;
            } else {
                throw error;
            }
        }

        if((typeof res.headers['content-type'] === 'string') && res.headers['content-type'].includes('application/json')) {
            return Thread.parseFromJson(imageBoard, board, res.data);
        } else {
            let error = new Error('Response content-type header is not set or not equal to application/json.');
            error.response = res;
            throw error;
        }
    };



    // #########################
    // Catalog observer controls
    // #########################

    /**
     * Start catalog observer timers.
     */
    startCatalogObserver() {
        let handleFetchErrors = (error) => {
            // TO-DO Log error
            console.log(error.message);
        };

        let wait = async (delay) => {
            return new Promise((resolve) => { setTimeout(resolve, delay); });
        };

        
        let handleFilesDiff = (thread, post, fad) => {
            /** @type {import('./commons/File').FileArraysDiff} */
            let fileArraysDiff = fad;

            // Handle deleted files.
            fileArraysDiff.filesWithoutPair1.forEach((file) => {
                if(!file.isDeleted) {
                    file.isDeleted = true;
                    this.emit(FileDeleteEvent.name, new FileDeleteEvent(thread, post, file));
                }
            });

            // Handle new files.
            fileArraysDiff.filesWithoutPair2.forEach((file) => {
                post.files.push(file);
                this.emit(FileCreateEvent.name, new FileCreateEvent(thread, post, file));
            });

            // Handle files differences.
            /** @type {import('./commons/File').FilesDiff} */
            let filesDiff;
            fileArraysDiff.differences.forEach((fd) => {
                filesDiff = fd;
                this.emit(FileModifyEvent.name, new FileModifyEvent(thread, post, filesDiff.file1, filesDiff));
            });
        };

        let handlePostsDiff = (td) => {
            /** @type {import('./commons/Thread').ThreadsDiff} */
            let threadsDiff = td;
            
            /** @type {import('./commons/Post').PostArraysDiff} */
            let postArraysDiff = threadsDiff.postsDiff;

            // Handle deleted posts.
            postArraysDiff.postsWithoutPair1.forEach((post) => {
                if(!post.isDeleted) {
                    post.isDeleted = true;
                    this.emit(PostDeleteEvent.name, new PostDeleteEvent(threadsDiff.thread1, post));

                    post.files.forEach((file) => {
                        file.isDeleted = true;
                        this.emit(FileDeleteEvent.name, new FileDeleteEvent(threadsDiff.thread1, post, file));
                    });
                }
            });

            // Handle new posts.
            postArraysDiff.postsWithoutPair2.forEach((post) => {
                threadsDiff.thread1.posts.push(post);
                this.emit(PostCreateEvent.name, new PostCreateEvent(threadsDiff.thread1, post));

                post.files.forEach((file) => {
                    this.emit(FileCreateEvent.name, new FileCreateEvent(threadsDiff.thread1, post, file));
                });
            });

            // Handle posts differences.
            /** @type {import('./commons/Post').PostsDiff} */
            let postsDiff;
            postArraysDiff.differences.forEach((pd) => {
                postsDiff = pd;

                if(postsDiff.post1.isDeleted) {
                    // TO-DO Log
                    console.log('Post has rose from the dead!');
                }

                if(postsDiff.fields.length > 0) {
                    this.emit(PostModifyEvent.name, new PostModifyEvent(threadsDiff.thread1, postsDiff.post1, postsDiff));
                }
                if(postsDiff.fields.includes('isBanned')) {
                    postsDiff.post1.isBanned = postsDiff.post2.isBanned;
                }
                if(postsDiff.fields.includes('files')) {
                    handleFilesDiff(threadsDiff.thread1, postsDiff.post1, postsDiff.filesDiff);
                }
            });
        };

        let updateThread = async (thread) => {
            // Events (ThreadModify, PostCreate, PostDelete, PostModify, FileCreate, FileDelete, FileModify)
            // are sequential. For examle, if a file has a modification, then this sequence of events will
            // happen: ThreadModify -> PostModify -> FileModify. Or, with some modifications to a post:
            // ThreadModify -> PostModify.
            //
            // If a post being deleted, then its files become deleted too (isDeleted is set to true).
            // The sequence of events for this case: ThreadModify -> PostDelete -> FileDelete.
            //
            // Events (ThreadDelete, ThreadNotFound, ThreadCreate) are single. It means that after firing
            // one of these events, events like (FileDelete, PostDelete) or (FileCreate, PostCreate) are
            // not being fired.
            //
            // Thread updater ignores viewsCount and lastActivity fields in the thread to thread comparison,
            // since catalog observer updates them. Also threads from fetchThread function have these properties
            // are set to 0.


            /** @type {Thread} */
            let fetchedThread;
            try {
                fetchedThread = await ThreadsObserverService.fetchThread(this.imageBoard, this.board, thread.number);
            } catch(error) {
                handleFetchErrors(error);
                return;
            }

            if(fetchedThread === 404) {
                thread.isDeleted = true;
                this.emit(ThreadDeleteEvent.name, new ThreadDeleteEvent(thread));
                return;
            }

            /** @type {import('./commons/Thread').ThreadsDiff} */
            let threadsDiff = Thread.diffThreads(thread, fetchedThread);
            threadsDiff.fields = threadsDiff.fields.filter(e => e !== 'lastActivity' && e !== 'viewsCount');

            if(threadsDiff.fields.length > 0) {
                this.emit(ThreadModifyEvent.name, new ThreadModifyEvent(thread, threadsDiff));
            }
            if(threadsDiff.fields.includes('postersCount')) {
                thread.postersCount = fetchedThread.postersCount;
            }
            if(threadsDiff.fields.includes('posts')) {
                handlePostsDiff(threadsDiff);
            }
        };


        let observeCatalog = async () => {
            // Since some of the thread fields are only available from its catalog thread's
            // representation, this function updates these fields and fires ThreadModifyEvent event,
            // on already stored threads.
            //
            // Observer method handles properties viewsCount and lastActivity by itself. If changes
            // are detected (in a stored thread to its representation on a catalog thread), then the
            // observer fires ThreadModifyEvent event, and after the event, applies the changes to a thread.

            /** @type {CatalogThread[]} */
            let catalog;
            try {
                catalog = await ThreadsObserverService.fetchCatalog(this.imageBoard, this.board);
            } catch(error) {
                handleFetchErrors(error);
                return;
            }

            if(catalog === 404) {
                // TO-DO Log 404
                console.log('Catalog fetch 404');
                return;
            }


            // Search for new or modified threads.
            let 
            /** @type {Thread} */ thread,
            /** @type {Thread} */ blankThread,
            /** @type {CatalogThread} */ catalogThread,
            /** @type {import('./commons/Thread').ThreadsDiff} */ threadsDiff;
            for(let i = 0; i < catalog.length; i++) {
                catalogThread = catalog[i];

                if(this.catalogWhitelistEnabled && ! this.catalogWhitelist.includes(catalogThread.number)) {
                    continue;
                }

                thread = this.getThread(catalogThread.number);
                if(thread !== null) {
                    if(thread.viewsCount !== catalogThread.viewsCount || thread.lastActivity !== catalogThread.lastActivity) {
                        blankThread = thread.clone();
                        blankThread.viewsCount = catalogThread.viewsCount;
                        blankThread.lastActivity = catalogThread.lastActivity;

                        threadsDiff = Thread.diffThreads(thread, blankThread);
                        this.emit(ThreadModifyEvent.name, new ThreadModifyEvent(thread, threadsDiff));
                        thread.viewsCount = catalogThread.viewsCount;
                        thread.lastActivity = catalogThread.lastActivity;

                        if(threadsDiff.fields.includes('lastActivity')) {
                            await updateThread(thread);
                            await wait(this.threadFetchDelay);
                        }
                    }
                } else {
                    try {
                        thread = await ThreadsObserverService.fetchThread(this.imageBoard, this.board, catalogThread.number);
                        await wait(this.threadFetchDelay);
                    } catch(error) {
                        handleFetchErrors(error);
                        continue;
                    }

                    if(thread === 404) {
                        this.emit(ThreadNotFoundEvent.name, new ThreadNotFoundEvent(catalogThread));
                        continue;
                    }

                    thread.lastActivity = catalogThread.lastActivity;
                    thread.viewsCount = catalogThread.viewsCount;
                    this.threads.push(thread);
                    this.emit(ThreadCreateEvent.name, new ThreadCreateEvent(thread));
                }
            }

            // Searching for probably deleted threads.
            for(let i = 0; i < this.threads.length; i++) {
                thread = this.threads[i];

                for(let j = 0; j < catalog.length; j++) {
                    catalogThread = catalog[j];
                    if(thread.number === catalogThread.number) {
                        break;
                    } else if(catalog.length - 1 === j) {
                        // Thread not found in the fetched catalog.
                        await updateThread(thread);
                        await wait(this.threadFetchDelay);
                    }
                }
            }
        };


        // Starter.
        let recursiveTimer = async () => {
            this.catalogObserverRunning && await observeCatalog();
            this.catalogObserverRunning && await wait(this.catalogObserverDelay);
            this.catalogObserverRunning && recursiveTimer();
        };

        this.catalogObserverRunning = true;
        setTimeout(recursiveTimer, this.catalogObserverDelay);
    };


    /**
     * Stop catalog observer timers.
     */
    stopCatalogObserver() {
        this.catalogObserverRunning = false;
    };
};


module.exports = ThreadsObserverService;