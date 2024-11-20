// imports / exports
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';

import AppManager from './src/controllers/AppManager.js';
import { SetupMulter } from './src/routes/APIRouter.js';

const pathName = fileURLToPath(import.meta.url);
const root = path.dirname(pathName);

// connect to database
await AppManager.InitSequelize(root);

// init express and controllers 
const app = await AppManager.InitApp(root);

SetupMulter(path.join(root, 'public', 'uploads'));

app.engine( 'handlebars', engine({
    defaultLayout: 'main'
    }));

const server = app.listen(3000, () => {
    AppManager.server = server;
    console.log('express app listening on port 3000');
});

export default app;

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



