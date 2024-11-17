// imports / exports
import path from 'path';

import { fileURLToPath } from 'url';
import AppManager from '../src/controllers/AppManager.js';
import { APIRouter, ViewRouter } from '../src/controllers/AppManager.js';

const filename = fileURLToPath(import.meta.url);


// establish port
const port = 3000; 

// project root dir
const root = path.dirname(path.dirname(filename));
let app;



try {

    // connect to database
    await AppManager.InitSequelize(root);

    // init express and controllers 
    app = await AppManager.InitApp(root); 

    app.use('/', ViewRouter.router);
    app.use('/api', APIRouter.router);

    AppManager.server = app.listen(port, () => {
        console.log('server started on port %d', port);
    });

} catch (err) {
    console.log(err);
    onExit();
}


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



