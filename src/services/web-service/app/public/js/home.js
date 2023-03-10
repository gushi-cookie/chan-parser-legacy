/**
 * @typedef {Object} CatalogThread
 * @property {number} id
 * @property {string} board
 * @property {string} imageBoard
 * @property {number} number
 * @property {string} title
 * @property {number} postersCount
 * @property {number} createTimestamp
 * @property {number} viewsCount
 * @property {number} lastActivity
 * @property {boolean} isDeleted
 * @property {number} postsCount
 * @property {number} filesCount
 */

/**
 * @typedef {Object} CatalogPost
 * @property {number} id
 * @property {number} number
 * @property {number} listIndex
 * @property {number} createTimestamp
 * @property {string} name
 * @property {string} comment
 * @property {boolean} isBanned
 * @property {boolean} isDeleted
 * @property {boolean} isOp
 */

/**
 * @typedef {Object} CatalogFile
 * @property {number} id
 * @property {number} listIndex
 * @property {number} url
 * @property {number} thumbnailUrl
 */





// ###################
//        Utils
// ###################

/**
 * Get a first child element, in its parent element, by className.
 * @param {HTMLElement} parentElement
 * @param {string} className
 * @returns {HTMLElement | null}
 */
function getByClass(parentElement, className) {
    let el = parentElement.getElementsByClassName(className)[0];
    return el === undefined ? null : el;
};

/**
 * Get a first parent element, by className.
 * @param {HTMLElement} childElement
 * @param {string} className 
 * @returns {HTMLElement | null}
 */
function getParentByClass(childElement, className) {
    let parent = childElement.parentElement;
    if(parent.classList.contains(className)) return parent;

    while(true) {
        parent = parent.parentElement;
        if(parent === null) {
            return null;
        } else if(parent.classList.contains(className)) {
            return parent;
        }
    }
};





// ###################
// Thread Card Methods
// ###################

// Misc
// ====


// Event Handlers
// ==============

/**
 * Create a new thread-card element.
 * @param {object} object {thread, post, files: nullable}
 * @returns {HTMLDivElement}
 */
function formThreadCard(object) {
    let 
    /**@type {CatalogThread}*/ thread = object.thread,
    /**@type {CatalogPost}  */ post = object.post,
    /**@type {CatalogFile}  */ file = object.file;

    let threadPath = `/thread?imageBoard=${thread.imageBoard}&board=${thread.board}&id=${thread.id}`;
    let imagePath = file === null || file.thumbnailUrl === null ? '/public/media/image-not-found.png' : file.thumbnailUrl;
    let title = thread.title.length === 0 ? post.comment.replaceAll('<br>', ' ').slice(0, 100) : thread.title.replaceAll('<br>', ' ');


    let plainHtml = `
    <div class="thread-card" id="${thread.id}" data-image-board="${thread.imageBoard}" data-board="${thread.board}">
        <div class="thread-card-head">
            <a target="_blank" href="${threadPath}">
                <img src="${imagePath}">
            </a>
        </div>

        <div class="thread-card-meta">
            <span class="thread-card-stat">${thread.postsCount}P / ${thread.filesCount}F</span>
            <span class="thread-card-title">${title}</span>
        </div>

        <div class="thread-card-comment">${post.comment}</div>
    </div>
    `;

    let blank = document.createElement('div');
    blank.innerHTML = plainHtml;

    let card = blank.children[0];

    return card;
};





// ###############
// Catalog Methods
// ###############

// Requests
// ========

/**
 * Request catalog threads from the API.
 * @param {string} imageBoard An image board's initials. May be null.
 * @param {board} board A board's initials. May be null.
 * @returns {Promise.<Object>} {threads: [{thread, post, file: nullable},]} 
 * @throws {AxiosError}
 */
async function requestCatalogThreads(imageBoard, board) {
    imageBoard = imageBoard === null ? '' : imageBoard;
    board = board === null ? '' : board;

    return (await axios.get(`/api/catalog-threads?imageBoard=${imageBoard}&board=${board}`)).data;
};

/**
 * Request a catalog metadata from the API.
 * @param {string} imageBoard Cannot be null.
 * @param {string} board Cannot be null. 
 * @returns {Promise.<Object | null>} {threadsCount, postsCount, filesCount}
 */
async function requestCatalogMeta(imageBoard, board) {
    let object = (await axios.get(`/api/catalog-threads/boards?imageBoard=${imageBoard}&board=${board}`)).data;
    return object[imageBoard] === undefined || object[imageBoard][board] === undefined 
            ? null : object[imageBoard][board];
};


// Misc
// ====

/**
 * Toggle a threads list of the catalog element. 
 * @param {HTMLElement} catalogEl Catalog element to be toggled.
 * @returns {boolean} Current state of the data-is-open attribute.
 */
function toggleCatalog(catalogEl) {
    let threadsEl = getByClass(catalogEl, 'catalog-threads-list');
    let toggleEl = getByClass(catalogEl, 'catalog-toggle');

    let isOpen = catalogEl.getAttribute('data-is-open') === 'true' ? true : false;

    if(isOpen) {
        threadsEl.style.display = 'none';
        catalogEl.setAttribute('data-is-open', false);
        toggleEl.classList.remove('catalog-toggle-active');
    } else {
        threadsEl.style.display = 'flex';
        catalogEl.setAttribute('data-is-open', true);
        toggleEl.classList.add('catalog-toggle-active');
    }
    return !isOpen;
};

/**
 * Check if a catalog is open.
 * @param {HTMLElement} catalogEl Catalog element to be checked.
 * @returns {boolean}
 */
function isCatalogOpen(catalogEl) {
    return catalogEl.getAttribute('data-is-open') === 'true' ? true : false;
};

/**
 * Update catalog's metadata and threads list if selected.
 * @param {HTMLElement} catalogEl Catalog element to be updated.
 * @param {boolean} updateList Should threads list be updated.
 * @throws {AxiosError}
 */
async function updateCatalog(catalogEl, updateList) {
    let imageBoard = catalogEl.getAttribute('data-image-board');
    let board = catalogEl.getAttribute('data-board');

    let meta = await requestCatalogMeta(imageBoard, board);
    if(meta !== null) {
        getByClass(catalogEl, 'catalog-files').innerText = `${meta.filesCount}F`;
        getByClass(catalogEl, 'catalog-posts').innerText = `${meta.postsCount}P`;
        getByClass(catalogEl, 'catalog-threads').innerText = `${meta.threadsCount}T`;
    }

    if(updateList) {
        let threadsListEl = getByClass(catalogEl, 'catalog-threads-list');
        let result = await requestCatalogThreads(imageBoard, board);
        
        threadsListEl.innerHTML = '';
        result.threads.forEach(object => {
            threadsListEl.appendChild(formThreadCard(object));
        });
    }
};


// Event Handlers
// ==============

/**
 * @param {MouseEvent} event 
 */
async function catalogToggleHandler(event) {
    let catalogEl = getParentByClass(event.target, 'catalog');

    toggleCatalog(catalogEl);
    if(isCatalogOpen(catalogEl) && getByClass(catalogEl, 'catalog-threads-list').children.length === 0) {
        await updateCatalog(catalogEl, true);
    }
};

/**
 * @param {MouseEvent} event 
 */
async function catalogUpdateHandler(event) {
    let catalogEl = getParentByClass(event.target, 'catalog');
    await updateCatalog(catalogEl, isCatalogOpen(catalogEl));
};


/**
 * Create a new catalog element.
 * @param {string} imageBoard Image board initials.
 * @param {string} board Board initials.
 * @param {object} object {board, threadsCount, postsCount, filesCount}
 * @returns {HTMLDivElement} 
 */
function formCatalog(imageBoard, board, object) {
    let plainHtml =
    `
    <div class="catalog" data-image-board="${imageBoard}" data-board="${board}" data-is-open="false">
        <div class="catalog-tab">
            <div class="catalog-menu">
                <button class="catalog-toggle">Toggle</button>
                <button class="catalog-update">Update</button>
            </div>

            <div class="catalog-meta">
                <span class="catalog-files">${object.filesCount}F</span>
                <span class="catalog-posts">${object.postsCount}P</span>
                <span class="catalog-threads">${object.threadsCount}T</span>
                <span class="catalog-board">${board}</span>
                <span class="catalog-image-board">${imageBoard}</span>
            </div>
        </div>

        <div class="catalog-threads-list" style="display: none;"></div>
    </div>
    `;
    let blank = document.createElement('div');
    blank.innerHTML = plainHtml;

    let element = blank.children[0];
    getByClass(element, 'catalog-toggle').addEventListener('click', catalogToggleHandler);
    getByClass(element, 'catalog-update').addEventListener('click', catalogUpdateHandler);

    return element;
};




// ####################
// Catalog Wrap Methods
// ####################

window.addEventListener('load', () => {
    let catalogsWrapEl = getByClass(document.body, 'catalogs-wrap');

    axios.get('/api/catalog-threads/boards').then(res => {
        // {imageBoard: {board: {threadsCount, postsCount, filesCount}},}
        let object = res.data;
    
        Object.getOwnPropertyNames(object).forEach(imageBoard => {
            Object.getOwnPropertyNames(object[imageBoard]).forEach(board => {
                catalogsWrapEl.appendChild(formCatalog(imageBoard, board, object[imageBoard][board]));
            });
        });
    }).catch(error => {
        console.log(error);
    });
});

