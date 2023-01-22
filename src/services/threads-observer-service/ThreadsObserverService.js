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

        this.circulatingQueue = [];
        this.circulatingQueue.locked = false;
        this.circulatingQueue.timer = null;
        this.circulatingQueue.stack = [];

        this.threadUpdaterRunning = false;
        this.threadUpdaterDelay = 500;

        this.imageBoard = '2ch';
        this.board = 'b';
    };



    // ########################
    // Thread storage interface
    // ########################

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
        // Since some of the thread fields are only available from its catalog thread's
        // representation, this function updates these fields and fires ThreadModifyEvent event,
        // on already stored threads.
        //
        // Observer method handles properties viewsCount and lastActivity by itself. If changes
        // are detected (in a stored thread to its representation on a catalog thread), then the
        // observer fires ThreadModifyEvent event, and after the event, applies the changes to a thread.

        let handleFetchErrors = (error) => {
            // TO-DO Log error
            console.log(error.message);
        };

        let observeCatalog = async () => {
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
            /** @type {import('./commons/Thread').ThreadsDiff} */ threadsDiff;
            catalog.forEach((catalogThread) => {
                if(this.catalogWhitelistEnabled && ! this.catalogWhitelist.includes(catalogThread.number)) {
                    return;
                }

                thread = this.getThread(catalogThread.number);
                if(thread !== null && !thread.isDeleted) {
                    if(thread.viewsCount !== catalogThread.viewsCount || thread.lastActivity !== catalogThread.lastActivity) {
                        blankThread = thread.clone();
                        blankThread.viewsCount = catalogThread.viewsCount;
                        blankThread.lastActivity = catalogThread.lastActivity;

                        threadsDiff = Thread.diffThreads(thread, blankThread);
                        this.emit(ThreadModifyEvent.name, new ThreadModifyEvent(thread, threadsDiff));
                        thread.viewsCount = catalogThread.viewsCount;
                        thread.lastActivity = catalogThread.lastActivity;

                        if(threadsDiff.fields.includes('lastActivity')) {
                            this.increaseThreadPriorityInQueue(thread);
                        }
                    }
                } else if(thread === null && !this.hasThreadInQueue(catalogThread.number)) {
                    this.addThreadToCirculatingQueue(catalogThread);
                }
            });

            // Searching for probably deleted threads.
            /** @type {CatalogThread} */
            let catalogThread;
            this.threads.forEach((thread) => {
                for(let i = 0; i < catalog.length; i++) {
                    catalogThread = catalog[i];
                    if(thread.number === catalogThread.number) {
                        break;
                    } else if(catalog.length - 1 === i) {
                        // Thread not found in the fetched catalog.
                        this.increaseThreadPriorityInQueue(thread);
                    }
                }
            });
        };

        let recursiveTimer = async () => {
            this.catalogObserverRunning && await observeCatalog();
            this.catalogObserverRunning && await (new Promise((resolve) => { setTimeout(resolve, this.threadUpdaterDelay); }));
            this.catalogObserverRunning && recursiveTimer();
        };

        // Starter.
        this.catalogObserverRunning = true;
        setTimeout(recursiveTimer, this.catalogObserverDelay);
    };


    /**
     * Stop catalog observer timers.
     */
    stopCatalogObserver() {
        this.catalogObserverRunning = false;
    };


    
    // ###########################
    // Circulating queue interface
    // ###########################

    /**
     * @param {number} number
     */
    hasThreadInQueue(number) {
        for(let i = 0; i < this.circulatingQueue.length; i++) {
            if(this.circulatingQueue[i].number === number) {
                return true;
            }
        }
        return false;
    };

    /**
     * Add thread to the circulating queue.
     * @param {CatalogThread | Thread} thread 
     */
    addThreadToCirculatingQueue(thread) {
        let fn = () => {
            this.circulatingQueue.unshift(thread);
        };

        if(this.circulatingQueue.timer !== null) {
            this.circulatingQueue.stack.push(fn);
        } else {
            fn();
        }
    };


    /**
     * Replace a thread in the start of the circulating queue.
     * @param {Thread | CatalogThread} thread 
     */
    increaseThreadPriorityInQueue(thread) {
        let fn = () => {
            let index = this.circulatingQueue.indexOf(thread);
            if(index < 0) {
                // TO-DO Thread not found in queue.
                return;
            }

            this.circulatingQueue.splice(index, 1);
            this.circulatingQueue.unshift(thread);
        };

        if(this.circulatingQueue.timer !== null) {
            this.circulatingQueue.stack.push(fn);
        } else {
            fn();
        }
    };


    /**
     * Lock circulating queue array for its interface methods.
     */
    lockCirculatingQueue() {
        let timer = () => {
            if(this.circulatingQueue.locked) {
                this.circulatingQueue.timer = setTimeout(timer, 500);
            } else {
                this.circulatingQueue.stack.forEach((fn) => { fn(); });
                this.circulatingQueue.timer = null;
                this.circulatingQueue.stack = [];
            }
        };

        this.circulatingQueue.locked = true;
        this.circulatingQueue.timer = setTimeout(timer, 500);
    };


    /**
     * Unlock circulating queue array for its interface methods.
     */
    unlockCirculatingQueue() {
        this.circulatingQueue.locked = false;
    };



    // #######################
    // Thread updater controls
    // #######################


    /**
     * Start thread updater timer.
     */
    startThreadUpdater() {
        // Events (ThreadModify, PostCreate, PostDelete, PostModify, FileCreate, FileDelete, FileModify)
        // are sequential. For examle, if a file has a modification, then this sequence of events will
        // happen: ThreadModify -> PostModify -> FileModify. Or, with some modifications to a post:
        // ThreadModify -> PostModify.
        //
        // If a post being deleted, then its files become deleted too (isDeleted is set to true).
        // The sequence of events for this case: ThreadModify -> PostDelete -> FileDelete.
        //
        // If a thread being deleted, then nothing happens to its posts or files.
        //
        // Events (ThreadDelete, ThreadNotFound, ThreadCreate) are single. It means that after firing
        // one of these events, events like (FileDelete, PostDelete) or (FileCreate, PostCreate) are
        // not being fired.
        //
        // Thread updater ignores viewsCount and lastActivity fields in the thread to thread comparison,
        // since catalog observer updates them. Also threads from fetchThread function have these properties
        // are set to 0.


        let handleFetchErrors = (error) => {
            console.log(error.message);
            // TO-DO Log
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

                if(postsDiff.fields.includes('isBanned')) {
                    postsDiff.post1.isBanned = postsDiff.post2.isBanned;
                }
                if(postsDiff.fields.length > 0) {
                    this.emit(PostModifyEvent.name, new PostModifyEvent(threadsDiff.thread1, postsDiff.post1, postsDiff));
                }
                if(postsDiff.fields.includes('files')) {
                    handleFilesDiff(threadsDiff.thread1, postsDiff.post1, postsDiff.filesDiff);
                }
            });
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

        let updateThread = async () => {
            this.lockCirculatingQueue();

            /** @type {Thread | CatalogThread} */
            let storedThread = this.circulatingQueue[0];
            if(storedThread === undefined) {
                this.unlockCirculatingQueue();
                return;
            }

            /** @type {Thread} */
            let fetchedThread;
            try {
                fetchedThread = await ThreadsObserverService.fetchThread(this.imageBoard, this.board, storedThread.number);
            } catch(error) {
                handleFetchErrors(error);
                this.unlockCirculatingQueue();
                return;
            }

            if(storedThread instanceof Thread) {
                if(fetchedThread instanceof Thread) {
                    // Check both threads

                    /** @type {import('./commons/Thread').ThreadsDiff} */
                    let threadsDiff = Thread.diffThreads(storedThread, fetchedThread);
                    threadsDiff.fields = threadsDiff.fields.filter(e => e !== 'lastActivity' && e !== 'viewsCount');

                    if(threadsDiff.fields.includes('postersCount')) {
                        storedThread.postersCount = fetchedThread.postersCount;
                    }
                    if(threadsDiff.fields.length > 0) {
                        this.emit(ThreadModifyEvent.name, new ThreadModifyEvent(storedThread, threadsDiff));
                    }
                    if(threadsDiff.fields.includes('posts')) {
                        handlePostsDiff(threadsDiff);
                    }

                    this.circulatingQueue.splice(0, 1);
                    this.circulatingQueue.push(storedThread);
                } else if(fetchedThread === 404) {
                    // Stored thread has been deleted from the board.
                    this.circulatingQueue.splice(0, 1);
                    storedThread.isDeleted = true;
                    this.emit(ThreadDeleteEvent.name, new ThreadDeleteEvent(storedThread));
                }
            }

            if(storedThread instanceof CatalogThread) {
                if(fetchedThread instanceof Thread) {
                    // New thread fetched from the catalog thread.
                    if(!this.getThread(fetchedThread.number)) {
                        fetchedThread.lastActivity = storedThread.lastActivity;
                        fetchedThread.viewsCount = storedThread.viewsCount;
                        this.threads.push(fetchedThread);
                        this.circulatingQueue.splice(0, 1);
                        this.circulatingQueue.push(fetchedThread);
                        this.emit(ThreadCreateEvent.name, new ThreadCreateEvent(fetchedThread));
                    } else {
                        // TO-DO -> Log collision
                        console.log('Threads collision occured. Num: ' + storedThread.number);
                        this.circulatingQueue.splice(0, 1);
                    }
                } else if(fetchedThread === 404) {
                    // Thread deleted before first fetch.
                    this.circulatingQueue.splice(0, 1);
                    this.emit(ThreadNotFoundEvent.name, new ThreadNotFoundEvent(storedThread));
                }
            }

            this.unlockCirculatingQueue();
        };

        let recursiveTimer = async () => {
            this.threadUpdaterRunning && await updateThread();
            this.threadUpdaterRunning && await (new Promise((resolve) => { setTimeout(resolve, this.threadUpdaterDelay); }));
            this.threadUpdaterRunning && recursiveTimer();
        };

        // Starter.
        this.threadUpdaterRunning = true;
        setTimeout(recursiveTimer, this.threadUpdaterDelay);
    };


    /**
     * Stop thread updater timer.
     */
    stopThreadUpdater() {
        this.threadUpdaterRunning = false;
    };
};


module.exports = ThreadsObserverService;