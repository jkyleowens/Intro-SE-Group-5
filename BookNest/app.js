// imports / exports
import path from 'path';
import multer from 'multer'

import { fileURLToPath } from 'url';
import AppManager from './src/controllers/AppManager.js';


const filename = fileURLToPath(import.meta.url);


// establish port
const port = 3000; 

// project root dir
const root = path.dirname(filename);





try {

    console.log(root);
    // connect to database
    await AppManager.InitSequelize(root);
    const app = await AppManager.InitApp(root); // inits controllers

    
    

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



export default AppManager;


