/**
 * @typedef {Object} Thread
 * @property {number} id
 * @property {number} number
 * @property {number} postersCount
 * @property {number} createTimestamp
 * @property {number} viewsCount
 * @property {string} board
 * @property {string} imageBoard
 * @property {string} title
 * @property {boolean} isDeleted
 * @property {Post[]} posts
 */

/**
 * @typedef {Object} Post
 * @property {number} id
 * @property {number} threadId
 * @property {number} number
 * @property {number} listIndex
 * @property {number} createTimestamp
 * @property {string} name
 * @property {string} comment
 * @property {boolean} isBanned
 * @property {boolean} isDeleted
 * @property {boolean} isOp
 * @property {File[]} files
 */

/**
 * @typedef {Object} File
 * @property {number} id
 * @property {number} postId
 * @property {number} listIndex
 * @property {string} cdnName
 * @property {string} uploadName
 * @property {string} checkSum
 * @property {string} extension
 * @property {boolean} isDeleted 
 */

/**
 * @typedef {Object} UpdateResult
 * @property {Thread} previousThread
 * @property {Thread} currentThread
 */



/**
 * Request a thread data by its id.
 * @param {number} id
 * @returns {Promise.<Thread | number>} Thread instance of 404 if not found.
 * @throws {AxiosError}
 */
async function requestThread(id) {
    try {
        return (await axios.get(`/api/thread/${id}`)).data;
    } catch(error) {
        if(error.response && error.response.status === 404) {
            return 404;
        } else {
            throw error;
        }
    }
};


/**
 * Create a new thread element.
 * @param {Thread} thread 
 * @return {HTMLDivElement}
 */
function formThread(thread) {
    let plainHtml =
    `
    <div class="thread${thread.isDeleted ? ' thread-deleted' : ''}"></div>
    `;
    let blank = document.createElement('div');
    blank.innerHTML = plainHtml;

    let element = blank.children[0];
    element.setAttribute('data-id', thread.id);
    element.setAttribute('data-number', thread.number);

    thread.posts.sort((a, b) => a.listIndex - b.listIndex).forEach((post, index) => {
        if(index === 0) {
            element.appendChild(formPost(post, thread.title));
        } else {
            element.appendChild(formPost(post, null));
        }
    });

    return element;
};

/**
 * Create a new post element.
 * @param {Post} post
 * @param {string} firstPostTitle If null then post-title element wont be added.
 * @returns {HTMLDivElement}
 */
function formPost(post, firstPostTitle) {
    let refsSample = `>>285460138 >>285461136 >>285462919 >>285463872 >>285463928 >>285463979`;
    let plainHtml =
    `
    <div class="post${post.isDeleted ? ' post-deleted' : ''}${post.isOp ? ' post-op' : ''}${post.isBanned ? ' post-banned' : ''}">
        <div class="post-details">
            <span class="post-name">${post.name}</span>
            <span class="post-time">${post.createTimestamp}</span>
            <span class="post-ref">
                <a href="/thread/${post.threadId}#${post.number}" id="${post.number}" class="post-ref-link">№</a>
                <a href="/thread/${post.threadId}#${post.number}" class="post-ref-link">${post.number}</a>
            </span>
            <span class="post-number">${post.listIndex}</span>
        </div>
        <div class="post-files"></div>
        <div class="post-message">${post.comment}</div>
        <div class="post-refs">${refsSample}</div>
    </div>
    `;
    let blank = document.createElement('div');
    blank.innerHTML = plainHtml;

    let element = blank.children[0];
    element.setAttribute('data-id', post.id);
    element.setAttribute('data-number', post.number);

    let postFilesEl = getByClass(element, 'post-files');
    post.files.sort((a, b) => a.listIndex - b.listIndex).forEach(file => {
        postFilesEl.appendChild(formFile(file));
    });

    let filesAmount = post.files.length;
    if(filesAmount === 0) {
        postFilesEl.classList.add('post-files-empty');
    } else if(filesAmount === 1) {
        postFilesEl.classList.add('post-files-single');
    } else if(filesAmount >= 2) {
        postFilesEl.classList.add('post-files-multiple');
    }

    if(firstPostTitle) {
        let postTitleEl = document.createElement('span');
        postTitleEl.classList.add('post-title');
        postTitleEl.innerText = firstPostTitle;

        element.querySelector('.post-details').prepend(postTitleEl);
    }

    return element;
};

/**
 * Create a new file element.
 * @param {File} file 
 * @returns {HTMLDivElement}
 */
function formFile(file) {
    let shortFileName = file.uploadName;
    if(shortFileName.length > 15) {
        shortFileName = `${shortFileName.slice(0, 15)}[...].${file.extension}`;
    } else {
        shortFileName = `${shortFileName}.${file.extension}`;
    }

    let plainHtml =
    `
    <figure class="file${file.isDeleted ? ' file-deleted' : ''}">
        <figcaption class="file-attr">
            <a class="file-link" target="_blank" href="/cdn/file/${file.id}/${file.cdnName}.${file.extension}" title="${file.cdnName}.${file.extension}">${shortFileName}</a>
            <span class="file-meta">39 Kb, 335x313(TO-DO)</span>
        </figcaption>

        <a class="file-image-link" target="_blank" href="/cdn/file/${file.id}/${file.cdnName}.${file.extension}">
            <img class="file-image">
        </a>
    </figure>
    `;
    let blank = document.createElement('div');
    blank.innerHTML = plainHtml;

    let element = blank.children[0];
    element.setAttribute('data-id', file.id);
    element.setAttribute('data-cdn-name', file.cdnName);
    element.setAttribute('data-upload-name', file.uploadName);

    let imageElement = getByClass(element, 'file-image');
    if(file.extension) {
        imageElement.src = `/cdn/thumbnail/${file.id}/${file.cdnName}_s.png` ;
    } else {
        imageElement.src = `/public/media/image-not-found.png` ;
    }

    return element;
};



// #############
// Notifications
// #############
const NOTIFICATION_LIFESPAN = 3000;

/**
 * Create a new notification element.
 * @returns {HTMLDivElement}
 */
function formNotification() {
    let plainHtml =
    `<div class="notification"></div>`;
    let blank = document.createElement('div');
    blank.innerHTML = plainHtml;

    return blank.children[0];
};

/**
 * Add a new notification to the notification container.
 * @param {string} text 
 * @param {boolean} endless
 * @returns {function} Reset function.
 */
function showNotification(text, endless) {
    let el = formNotification();
    el.innerText = text;

    let containerEl = getByClass(document.body, 'notifications-container');
    containerEl.appendChild(el);

    let id;
    if(!endless) {
        id = setTimeout(() => {
            containerEl.removeChild(el);
        }, NOTIFICATION_LIFESPAN);
    }
    
    return () => {
        if(!endless) clearTimeout(id);
        containerEl.removeChild(el);
    };
};



// ##############
// Event Handlers
// ##############
const AUTOUPDATE_INTERVAL = 15000;

async function autoUpdateHandler(event) {
    let timerElements = document.getElementsByClassName('menu-auto-update-timer');
    let checkboxElements = document.getElementsByClassName('menu-auto-update-checkbox');

    if(!event.target.checked) {
        Array.prototype.forEach.call(timerElements, el => { el.innerText = ''; });
        Array.prototype.forEach.call(checkboxElements, el => { el.checked = false; });
        clearInterval(window.autoUpdateTimerId);
        return;
    } else {
        Array.prototype.forEach.call(checkboxElements, el => { el.checked = true; });
    }


    let counter = AUTOUPDATE_INTERVAL / 1000;
    let intervalCallback = async () => {
        Array.prototype.forEach.call(timerElements, el => { el.innerText = counter; });

        counter--;
        if(counter < 0) {
            if(window.autoUpdateTimerId) clearInterval(window.autoUpdateTimerId);

            counter = AUTOUPDATE_INTERVAL / 1000;

            let updatingReset = showNotification('Updating..', true);
            let updateResult = await updateThread();

            let newPostsCount = findNewPosts(updateResult.previousThread.posts, updateResult.currentThread.posts).length;

            updatingReset();
            if(newPostsCount === 0) {
                showNotification('No new posts', false);
            } else {
                showNotification(`New posts: ${newPostsCount}`, false);
            }

            if(window.autoUpdateTimerId) window.autoUpdateTimerId = setInterval(intervalCallback, 1000);


            let thread = updateResult.currentThread;
            setMenuStat(thread.posts.length, findImagesAmount(thread), thread.postersCount);
        }
    };
    
    window.autoUpdateTimerId = setInterval(intervalCallback, 1000);
    Array.prototype.forEach.call(timerElements, el => { el.innerText = counter; });
};

async function updateHandler(event) {
    let resetNotification = showNotification('Updating..', true);
    let updateResult = await updateThread();
    resetNotification();

    let thread = updateResult.currentThread;

    let newPostsNumber;
    if(updateResult.previousThread) {
        newPostsNumber = findNewPosts(updateResult.previousThread.posts, thread.posts).length;
    } else {
        newPostsNumber = thread.posts.length;
        setTitle(thread);
    }
    
    setMenuStat(thread.posts.length, findImagesAmount(thread), thread.postersCount);
    if(newPostsNumber === 0) {
        showNotification('No new posts', false);
    } else {
        showNotification(`New posts: ${newPostsNumber}`, false);
    }
};



// ####
// Misc
// ####

/**
 * Extract thread id from the URL.
 * @returns {number} Id of a thread.
 */
function getThreadId() {
    let url = new URL(window.location.href);
    let paths = url.pathname.split('/');
    return paths[paths.length-1];
};

/**
 * Set statistics of a thread in menu stat.
 * @param {number} postsCount 
 * @param {number} imagesCount 
 * @param {number} postersCount 
 */
function setMenuStat(postsCount, imagesCount, postersCount) {
    document.querySelectorAll('.menu-stat-posts span').forEach(el => {
        el.innerText = postsCount;
    });

    document.querySelectorAll('.menu-stat-images span').forEach(el => {
        el.innerText = imagesCount;
    });

    document.querySelectorAll('.menu-stat-posters span').forEach(el => {
        el.innerText = postersCount;
    });
};

/**
 * Update current thread.
 * @returns {Promise.<UpdateResult>} 
 */
async function updateThread() {
    let id = getThreadId();

    let thread = await requestThread(id);
    if(thread === 404) {
        throw new Error('Thread not found!');
    }

    let updateResult = {
        previousThread: window.lastFetchedThread ? window.lastFetchedThread : null,
        currentThread: thread,
    };

    window.lastFetchedThread = thread;
    let container = getByClass(document.body, 'thread-container');
    container.innerHTML = '';
    container.appendChild(formThread(thread));

    return updateResult;
};

/**
 * Find posts in posts2 array that are not in posts1 array.
 * @param {Array[Post]} posts1 Old posts set.
 * @param {Array[Post]} posts2 New posts set.
 * @returns {Array[Post]} New posts.
 */
function findNewPosts(posts1, posts2) {
    let newPosts = [];
    for(let i = 0; i < posts2.length; i++) {
        for(let j = 0; j < posts1.length; j++) {
            if(posts2[i].id === posts1[j].id) {
                break;
            } else if(posts1.length - 1 === j && posts2[i].id !== posts1[j].id) {
                newPosts.push(posts1[j]);
            }
        }
    }
    return newPosts;
};

/**
 * Find
 * @param {Thread} thread 
 */
function findImagesAmount(thread) {
    let count = 0;
    thread.posts.forEach(post => {
        count += post.files.length;
    });
    return count;
};

/**
 * Set title of the page by a thread data.
 * @param {Thread} thread 
 */
function setTitle(thread) {
    document.title = `/${thread.board}/ - ${thread.title}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    Array.prototype.forEach.call(document.getElementsByClassName('menu-update'), el => {
        el.addEventListener('click', updateHandler);
    });

    Array.prototype.forEach.call(document.getElementsByClassName('menu-auto-update-checkbox'), el => {
        el.addEventListener('change', autoUpdateHandler);
    });


    let id = getThreadId();
    document.title = `Thread ${id}.`;

    let thread = await requestThread(id);
    if(thread === 404) {
        alert('Thread not found!');
        throw new Error('Thread not found!');
    }

    window.lastFetchedThread = thread;
    setTitle(thread);
    setMenuStat(thread.posts.length, findImagesAmount(thread), thread.postersCount);
    getByClass(document.body, 'thread-container').appendChild(formThread(thread));
});