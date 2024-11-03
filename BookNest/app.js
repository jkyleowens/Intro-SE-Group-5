// imports / exports
import path from 'path';

import AppManager from './src/controllers/AppManager.js';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);


// establish port
const port = 3000; 

// project root dir
const root = path.dirname(__filename);



try {

    // connect to database
    await AppManager.initSequelize();
    await AppManager.initApp(root, port); // inits controllers

} catch (err) {

    appMngr.failure('starting express app', err);
    appMngr.onExit();
}


export default AppManager;


async function onExit()
{
    let msg;
    try {

        msg = 'closing express server';
        AppManager.server.close(async () => {
        
            await AppManager.sequelize.close();
            AppManager.success(msg);
            console.log('express server successfully closed.');
            process.exit(0);

        
        })
        setTimeout(() => {
            throw new Error('timed out while ' + msg + '. exiting...');
        }, 5000);
    } catch (err) {
        console.error(msg + ' failed: ' + err);
        process.exit(1);
    }
}



// hooks for process terminated
process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);






