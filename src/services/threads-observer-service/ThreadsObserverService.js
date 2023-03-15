const axios = require('axios');
const Thread = require('./commons/Thread');
const CatalogThread = require('./commons/CatalogThread');
const EventEmitter = require('events');
const StoredThread = require('../database-service/commons/StoredThread');
const StoredPost = require('../database-service/commons/StoredPost');
const StoredFile = require('../database-service/commons/StoredFile');

const ThreadCreateEvent = require('./events/ThreadCreateEvent');
const ThreadDeleteEvent = require('./events/ThreadDeleteEvent');
const ThreadModifyEvent = require('./events/ThreadModifyEvent');
const ThreadDBFetchEvent = require('./events/ThreadDBFetchEvent');
const ThreadNotFoundEvent = require('./events/ThreadNotFoundEvent');
const PostReplyEvent = require('./events/PostReplyEvent');
const PostCreateEvent = require('./events/PostCreateEvent');
const PostDeleteEvent = require('./events/PostDeleteEvent');
const PostModifyEvent = require('./events/PostModifyEvent');
const PostDBFetchEvent = require('./events/PostDBFetchEvent');
const FileCreateEvent = require('./events/FileCreateEvent');
const FileDeleteEvent = require('./events/FileDeleteEvent');
const FileModifyEvent = require('./events/FileModifyEvent');
const FileDBFetchEvent = require('./events/FileDBFetchEvent');



/**
 * Class representing catalog and thread observers with event callbacks.
 */
class ThreadsObserverService extends EventEmitter {
    /**
     * Create an instance of the ThreadsObserverService class.
     */
    constructor() {
        super();

        /** @type {import('../database-service/DatabaseService')} */
        this.database = null;

        this.threads = [];

        this.catalogWhitelist = [];
        this.catalogWhitelistEnabled = false;

        this.catalogObserverRunning = false;
        this.catalogObserverDelay = 2500;
        this.threadFetchDelay = 500;

        this.imageBoard = '4chan';
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

    /**
     * Search for a thread with the specified file.
     * @param {File} file
     * @returns {Thread | null}
     */
    getThreadByFile(file) {
        for(let i = 0; i < this.threads.length; i++) {
            if(this.threads[i].hasFile(file)) {
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



    // #################
    // Database controls
    // #################

    /**
     * Get all not deleted threads from the database.
     * @throws {SQLiteError}
     */
    async _getStoredThreads() {
        // The method fires sequently these events:
        // ThreadDBFetchEvent -> PostDBFetchEvent -> FileDBFetchEvent.
        // First goes a Thread event, then go all Post events and then go all File events.
        // Events are fired before adding the thread in the storage.


        let unwrapTree = (tree) => {
            let files = new Map();
            let posts = new Array();

            tree.files.forEach((storedFile) => {
                if(!files.has(storedFile.postId)) {
                    files.set(storedFile.postId, []);
                }
                files.get(storedFile.postId).push({file: storedFile.toObserverFile(), storedFile});
            });

            tree.posts.forEach((storedPost) => {
                if(files.has(storedPost.id)) {
                    posts.push({
                        post: storedPost.toObserverPost(files.get(storedPost.id).map(fileObj => fileObj.file)),
                        storedPost,
                    });
                } else {
                    posts.push({
                        post: storedPost.toObserverPost([]),
                        storedPost,
                    });
                }
            });


            let thread = tree.thread.toObserverThread(posts.map(postObj => postObj.post));
            this.emit(ThreadDBFetchEvent.name, new ThreadDBFetchEvent(thread, tree.thread));

            posts.forEach(postObj => {
                this.emit(PostDBFetchEvent.name, new PostDBFetchEvent(thread, postObj.post, postObj.storedPost));
            });

            let post;
            files.forEach((postFiles, postId) => {
                post = thread.getPostById(postId);
                postFiles.forEach(fileObj => {
                    this.emit(FileDBFetchEvent.name, new FileDBFetchEvent(thread, post, fileObj.file, fileObj.storedFile));
                });
            });
            
            return thread;
        };

        let headers = await this.database.threadQueries.selectThreads(this.imageBoard, this.board, false);

        let tree;
        for(let i = 0; i < headers.length; i++) {
            tree = await this.database.threadQueries.selectThreadTree(this.imageBoard, this.board, headers[i].id);
            this.threads.push(unwrapTree(tree));
        }
    };


    /**
     * Insert a thread, its posts and files, in the database.
     * 
     * Note: method should be used if the thread's id is null.
     * @param {Thread} thread Thread to be inserted in the database. 
     * @throws {SQLiteError}
     */
    async _insertThreadTree(thread) {
        thread.id = await this.database.threadQueries.insertThread(StoredThread.makeFromObserverThread(thread));

        let post;
        let sPost;
        let sFile;
        for(let i = 0; i < thread.posts.length; i++) {
            post = thread.posts[i];
            sPost = StoredPost.makeFromObserverPost(post, thread.id);
            post.id = await this.database.postQueries.insertPost(sPost);

            for(let j = 0; j < post.files.length; j++) {
                sFile = StoredFile.makeFromObserverFile(post.files[j], post.id);
                post.files[j].id = await this.database.fileQueries.insertFile(sFile);
            }
        }
    };


    /**
     * Insert a new post in the database.
     * @param {Post} post 
     * @param {number} threadId 
     * @returns {Promise.<boolean>}
     */
    async _insertPost(post, threadId) {
        try {
            post.id = await this.database.postQueries.insertPost(StoredPost.makeFromObserverPost(post, threadId));
        } catch(error) {
            this._handleDatabaseErrors(error);
            return false;
        }
        return true;
    };


    /**
     * Insert a new file in the database.
     * @param {File} file 
     * @param {number} postId 
     * @returns {Promise.<boolean>}
     */
    async _insertFile(file, postId) {
        try {
            file.id = await this.database.fileQueries.insertFile(StoredFile.makeFromObserverFile(file, postId));
        } catch(error) {
            this._handleDatabaseErrors(error);
            return false;
        }
        return true;
    };


    /**
     * Update a thread's specific fields in the database.
     * @param {Thread} thread 
     * @param {String[]} fields 
     * @returns {Promise.<boolean>}
     */
    async _updateThread(thread, fields) {
        let sThread = StoredThread.makeFromObserverThread(thread);
        try {
            fields.push('postsCount', 'filesCount');
            await this.database.threadQueries.updateThread(sThread, fields);
        } catch(error) {
            this._handleDatabaseErrors(error);
            return false;
        }
        return true;
    };


    /**
     * Update a post's specific fields in the database.
     * @param {Post} post 
     * @param {String[]} fields 
     * @returns {Promise.<boolean>}
     */
    async _updatePost(post, fields) {
        let sPost = StoredPost.makeFromObserverPost(post, null);
        try {
            await this.database.postQueries.updatePost(sPost, fields);
        } catch(error) {
            this._handleDatabaseErrors(error);
            return false;
        }
        return true;
    };


    /**
     * Update a file's specific fields in the database.
     * @param {File} file 
     * @param {String[]} fields 
     * @returns {Promise.<boolean>}
     */
    async _updateFile(file, fields) {
        let sFile = StoredFile.makeFromObserverFile(file, null);
        try {
            await this.database.fileQueries.updateFile(sFile, fields);
        } catch(error) {
            this._handleDatabaseErrors(error);
            return false;
        }
        return true;
    };



    // #########################
    // Catalog observer controls
    // #########################

    /**
     * Work with an axios error.
     * @param {AxiosError} error 
     */
    _handleFetchErrors(error) {
        // TO-DO Log error
        console.log(error.message);
    };

    /**
     * Work with an sqlite error.
     * @param {SQLiteError} error 
     */
    _handleDatabaseErrors(error) {
        // TO-DO Log error
        console.log(error);
    };

    /**
     * Delay a current thread (current code execution).
     * @param {number} delay Delay in milliseconds.
     */
    async _wait(delay) {
        return new Promise((resolve) => { setTimeout(resolve, delay); });
    };


    /**
     * Handle FileArraysDiff object, with firing events.
     * @param {Thread} thread 
     * @param {Post} post 
     * @param {import('./commons/File').FileArraysDiff} fad 
     */
    async _handleFilesDiff(thread, post, fad) {
        let fileArraysDiff = fad;

        // Handle deleted files.
        let file;
        for(let i = 0; i < fileArraysDiff.filesWithoutPair1.length; i++) {
            file = fileArraysDiff.filesWithoutPair1[i];
            if(!file.isDeleted) {
                file.isDeleted = true;
                this.emit(FileDeleteEvent.name, new FileDeleteEvent(thread, post, file));
                await this._updateFile(file, ['isDeleted']);
            }
        };

        // Handle new files.
        for(let i = 0; i < fileArraysDiff.filesWithoutPair2.length; i++) {
            file = fileArraysDiff.filesWithoutPair2[i];
            post.files.push(file);
            this.emit(FileCreateEvent.name, new FileCreateEvent(thread, post, file));
            await this._insertFile(file, post.id);
        };

        // Handle files differences.
        /** @type {import('./commons/File').FilesDiff} */
        let filesDiff;
        for(let i = 0; i < fileArraysDiff.differences.length; i++) {
            filesDiff = fileArraysDiff.differences[i];
            this.emit(FileModifyEvent.name, new FileModifyEvent(thread, post, filesDiff.file1, filesDiff));
            await this._updateFile(filesDiff.file1, [filesDiff.fields]);
        };
    };

    /**
     * Handle ThreadsDiff object, with firing events.
     * @param {import('./commons/Thread').ThreadsDiff} td
     */
    async _handlePostsDiff(td) {
        let threadsDiff = td;

        /** @type {import('./commons/Post').PostArraysDiff} */
        let postArraysDiff = threadsDiff.postsDiff;

        // Handle deleted posts.
        let post;
        let file;
        for(let i = 0; i < postArraysDiff.postsWithoutPair1.length; i++) {
            post = postArraysDiff.postsWithoutPair1[i];

            if(!post.isDeleted) {
                post.isDeleted = true;
                this.emit(PostDeleteEvent.name, new PostDeleteEvent(threadsDiff.thread1, post));
                await this._updatePost(post, ['isDeleted']);

                for(let j = 0; j < post.files.length; j++) {
                    file = post.files[j];
                    file.isDeleted = true;
                    this.emit(FileDeleteEvent.name, new FileDeleteEvent(threadsDiff.thread1, post, file));
                    await this._updateFile(file, ['isDeleted']);
                };
            }
        };

        // Handle new posts.
        for(let i = 0; i < postArraysDiff.postsWithoutPair2.length; i++) {
            post = postArraysDiff.postsWithoutPair2[i];

            threadsDiff.thread1.posts.push(post);
            this.emit(PostCreateEvent.name, new PostCreateEvent(threadsDiff.thread1, post));
            await this._insertPost(post, threadsDiff.thread1.id);

            for(let j = 0; j < post.files.length; j++) {
                file = post.files[j];
                this.emit(FileCreateEvent.name, new FileCreateEvent(threadsDiff.thread1, post, file));
                await this._insertFile(file, post.id);
            };
        };

        // Handle posts differences.
        /** @type {import('./commons/Post').PostsDiff} */
        let postsDiff;
        for(let i = 0; i < postArraysDiff.differences.length; i++) {
            postsDiff = postArraysDiff.differences[i];

            if(postsDiff.post1.isDeleted) {
                // TO-DO Log
                console.log('Post has rose from the dead!');
            }

            if(postsDiff.fields.length > 0) {
                this.emit(PostModifyEvent.name, new PostModifyEvent(threadsDiff.thread1, postsDiff.post1, postsDiff));
            }
            if(postsDiff.fields.includes('isBanned')) {
                postsDiff.post1.isBanned = postsDiff.post2.isBanned;
                await this._updatePost(postsDiff.post1, ['isBanned']);
            }
            if(postsDiff.fields.includes('files')) {
                await this._handleFilesDiff(threadsDiff.thread1, postsDiff.post1, postsDiff.filesDiff);
            }
        };
    };

    /**
     * Update a thread by comparing it with its fresh image board's representation.
     * If some changes are found, then according events are fired.
     * @param {Thread} thread Thread to update.
     */
    async _handleThread(thread) {
        // Events (ThreadModify, PostCreate, PostDelete, PostModify, FileCreate, FileDelete, FileModify)
        // are sequential. For example, if a file has a modification, then this sequence of events will
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
            this._handleFetchErrors(error);
            return;
        }

        if(fetchedThread === 404) {
            thread.isDeleted = true;
            this.emit(ThreadDeleteEvent.name, new ThreadDeleteEvent(thread));
            await this._updateThread(thread, ['isDeleted']);
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
            await this._updateThread(thread, ['postersCount']);
        }
        if(threadsDiff.fields.includes('posts')) {
            await this._handlePostsDiff(threadsDiff);
        }
    };

    /**
     * Make a requests to the active image board's catalog. If the catalog shows
     * changes in stored threads, then differed threads are being checked in detail,
     * by the _handleThread function. 
     */
    async _observeCatalog() {
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
            this._handleFetchErrors(error);
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

                    await this._updateThread(thread, threadsDiff.fields);

                    if(threadsDiff.fields.includes('lastActivity')) {
                        await this._handleThread(thread);
                        await this._wait(this.threadFetchDelay);
                    }
                }
            } else {
                try {
                    thread = await ThreadsObserverService.fetchThread(this.imageBoard, this.board, catalogThread.number);
                    await this._wait(this.threadFetchDelay);
                } catch(error) {
                    this._handleFetchErrors(error);
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

                try {
                    await this._insertThreadTree(thread);
                } catch(error) {
                    this._handleDatabaseErrors(error);
                    continue;
                }
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
                    await this._handleThread(thread);
                    await this._wait(this.threadFetchDelay);
                }
            }
        }
    };


    /**
     * Start catalog observer timers.
     */
    async startCatalogObserver() {
        this.database = process.database;

        try {
            await this._getStoredThreads();
        } catch(error) {
            this._handleDatabaseErrors(error);
        }

        // Starter.
        let recursiveTimer = async () => {
            this.catalogObserverRunning && await this._observeCatalog();
            this.catalogObserverRunning && await this._wait(this.catalogObserverDelay);
            this.catalogObserverRunning && recursiveTimer();
        };

        this.catalogObserverRunning = true;
        setTimeout(recursiveTimer, this.catalogObserverDelay);
    };

    /**
     * Stop catalog observer timers.
     */
    async stopCatalogObserver() {
        this.catalogObserverRunning = false;
    };
};


module.exports = ThreadsObserverService;