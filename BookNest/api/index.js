// imports / exports
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

import APIRouter from '../src/routes/APIRouter.js';
import ViewRouter from '../src/routes/ViewRouter.js';

import AppManager from '../src/controllers/AppManager.js';

const pathName = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(pathName);

// project root dir
const imgStore = path.join(root, 'public', 'uploads');

// connect to database
await AppManager.InitSequelize(root);

// init express and controllers 
const app = await AppManager.InitApp(root);
app.set('views', path.join(root, 'src', 'views'));

// setup multer
const storage = multer.diskStorage({
    destination: imgStore, // Save images here

    filename: (req, file, cb) => { // unique fileName
        const isbn = req.body.isbn;
        const unique = Date.now() + '-' + isbn;
        const ext = '.jpg';

        cb(null, (unique + ext)); // Unique file name + extension
    },
});

const upload = multer({ storage: storage }); 

app.use('/api', APIRouter);
app.use('/', ViewRouter);

// add new book upon post from client
APIRouter.post('/add-book', upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'isbn', maxCount: 1 }
]), AddBook);

export default (req, res) => {
    app(req, res);
};

async function onExit()
{
    let msg;
    try {

        msg = 'closing express server';
        await AppManager.CloseApp();

        console.log('App successfully closed.');
        
        setTimeout(() => {
            throw new Error('timed out while ' + msg + '. exiting...');
        }, 5000);
        process.exit(0);
    } catch (err) {
        console.error(msg + ' failed: ' + err);
        process.exit(1);
    }
}



// hooks for process terminated
process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);

async function AddBook (req, res) {
    const result = {
        success: true,
        message: null
    };
    
    const isbn = req.body.isbn;
    const name = req.body.name;
    const author = req.body.author;
    const price = req.body.price;
    const stock = req.body.stock;
    const coverImage = req.files.coverImage[0].filename;

    const action = `Adding new book: {${isbn} ${name} ${author} $${price} ${stock}}`;

    let book = null;
    try {
        book = await InventoryManager.new_item(isbn, name, author, price, stock, coverImage);
        if (!book) throw `creating sequelize model instance returned null`;

        result.message = `${action} was successful!`;
        req.flash('messages', result.message);
        return res.json(result);
    } catch (err) {
        result.success = false;
        result.message = `Error ${action}! ` + err;
        req.session.flash('messages', result.message);
        return res.json(result);
    }
}

