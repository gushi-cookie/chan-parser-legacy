/** @type {import('../../../database-service/DatabaseService')} */
const database = process.database;


function toCatalogThread(stored) {
    return {
        id: stored.id,
        board: stored.board,
        imageBoard: stored.imageBoard,
        number: stored.number,
        title: stored.title,
        postersCount: stored.postersCount,
        createTimestamp: stored.createTimestamp,
        viewsCount: stored.viewsCount,
        lastActivity: stored.lastActivity,
        isDeleted: stored.isDeleted,
        postsCount: stored.postsCount,
        filesCount: stored.filesCount,
    };
};

function toCatalogPost(stored) {
    return {
        id: stored.id,
        number: stored.number,
        listIndex: stored.listIndex,
        createTimestamp: stored.createTimestamp,
        name: stored.name,
        comment: stored.comment,
        isBanned: stored.isBanned,
        isDeleted: stored.isDeleted,
        isOp: stored.isOp,
    };
};

function toCatalogFile(stored) {
    return {
        id: stored.id,
        listIndex: stored.listIndex,
        url: 
            stored.extension ? `/cdn/file/${stored.id}/${stored.cdnName}.${stored.extension}` : null,
        thumbnailUrl: 
            stored.extension ? `/cdn/thumbnail/${stored.id}/${stored.cdnName}_s.png` : null,
    };
};

const catalogThreadsGetApi = async (req, res) => {
    let imageBoard = req.query.imageBoard;
    let board = req.query.board;
    let id = req.query.id;

    imageBoard = imageBoard ? imageBoard : null;
    board = board ? board : null;
    id = Number(id);
    if(req.query.id && Number.isNaN(id)) {
        res.status(400).send('Parameter \'id\' has invalid value.');
        return;
    }

    let result;
    let object;
    try {
         if(imageBoard && board && id) {
            object = {};

            result = await database.threadQueries.selectThread(imageBoard, board, id);
            if(result === null) {
                res.status(404).send('Thread not found! 404');
                return;
            }
            object.thread = toCatalogThread(result);

            result = await database.postQueries.selectFirstPostOfThread(id);
            object.post = toCatalogPost(result);

            result = await database.fileQueries.selectFirstFileOfPost(object.post.id, ['data', 'thumbnail_data']);
            object.file = result !== null ? toCatalogFile(result) : null;
            
            res.json({threads: object});
        } else {
            let threads = [];
            storedThreads = await database.threadQueries.selectThreads(imageBoard, board, true);

            for(let i = 0; i < storedThreads.length; i++) {
                object = { thread: storedThreads[i] };

                result = await database.postQueries.selectFirstPostOfThread(object.thread.id);
                object.post = toCatalogPost(result);

                result = await database.fileQueries.selectFirstFileOfPost(object.post.id, ['data', 'thumbnail_data']);
                object.file = result !== null ? toCatalogFile(result) : null;
            
                threads.push(object);
            };

            res.json({threads});
        }
    } catch(error) {
        console.log(error);
        res.status(500).send('Database error has occurred, while working on the request! 505');
    }
};


const boardsListGetApi = async (req, res) => {
    let imageBoard = req.query.imageBoard;
    let board = req.query.board;

    imageBoard = imageBoard ? imageBoard : null;
    board = board ? board : null;

    try {
        let result = await database.threadQueries.selectBoards(imageBoard, board);
        res.json(result);
    } catch(error) {
        console.log(error);
        res.status(500).send('Database error has occurred, while working on the request! 505');
    }
};


module.exports = {
    catalogThreadsGetApi,
    boardsListGetApi,
};