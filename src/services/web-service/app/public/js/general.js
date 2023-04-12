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