const appPath = process.env.WEB_SERVICE_APP_PATH;


/** @type {import('../../../database-service/DatabaseService')} */
const database = process.database;

/** @type {import('winston').Logger} */
const logger = process.webLogger;



const threadView = (req, res) => {
    // GET: /thread/:id
    res.render(`${appPath}/views/thread`);
};


const threadGetApi = async (req, res) => {
    // GET: /api/thread/:id

    let tree;
    try {
        tree = await database.threadQueries.selectThreadTree(req.params.id);
    } catch(error) {
        logger.error(error);
        res.status(500).send('Database error has occurred, while working on the request! 500');
        return;
    }

    if(tree === null) {
        res.status(404).send('Thread not found! 404');
        return;
    }


    let posts = tree.posts;
    let files;
    let file;
    posts.forEach((post, index) => {
        files = [];
        for(let i = 0; i < tree.files.length; i++) {
            file = tree.files[i];
            if(file.postId !== post.id) continue;

            files.push({
                id: file.id,
                postId: file.postId,
                listIndex: file.listIndex,
                cdnName: file.cdnName,
                uploadName: file.uploadName,
                checkSum: file.checkSum,
                extension: file.extension,
                isDeleted: file.isDeleted,
            });
        }

        posts[index] = {
            id: post.id,
            threadId: post.threadId,
            number: post.number,
            listIndex: post.listIndex,
            createTimestamp: post.createTimestamp,
            name: post.name,
            comment: post.comment,
            isBanned: post.isBanned,
            isDeleted: post.isDeleted,
            isOp: post.isOp,
            files: files,
        };
    });

    let thread = {
        id: tree.thread.id,
        number: tree.thread.number,
        postersCount: tree.thread.postersCount,
        createTimestamp: tree.thread.createTimestamp,
        viewsCount: tree.thread.viewsCount,
        board: tree.thread.board,
        imageBoard: tree.thread.imageBoard,
        title: tree.thread.title,
        isDeleted: tree.thread.isDeleted,
        posts: posts,
    };


    res.json(thread);
};




module.exports = {
    threadView,
    threadGetApi,
};