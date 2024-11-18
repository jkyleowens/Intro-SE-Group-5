// imports / exports
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

import AppManager from '../src/controllers/AppManager.js';

const pathName = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(pathName);

// project root dir
const imgStore = path.join(root, 'public', 'uploads');
export { imgStore };

// connect to database
await AppManager.InitSequelize(root);

// init express and controllers 
const app = await AppManager.InitApp();
app.set('views', path.join(root, 'src', 'views'));

import APIRouter from '../src/routes/APIRouter.js';
import ViewRouter from '../src/routes/ViewRouter.js';

app.use('/api', APIRouter);
app.use('/', ViewRouter);



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



