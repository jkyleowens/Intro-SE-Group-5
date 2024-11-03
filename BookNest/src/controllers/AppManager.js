import { Sequelize } from 'sequelize';
import multer from 'multer';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash'
import path from 'path';

import init_item from '../models/item.js';
import init_order_item from '../models/order_item.js';
import init_order from '../models/order.js';
import init_user from '../models/user.js';

import UserManager from './UserManager.js';
import UserClient from '../../public/javascript/UserClient.js';
import InventoryManager from './InventoryManager.js';

import ViewRouter from '../routes/ViewRouter.js';

import { fileURLToPath } from 'url';

class AppManager
{
    #router;
    #sequelize;
    #storage; #upload;

    constructor (root, port) 
    {
        this.app = null;
        this.server = null;
        this.imgStore = null;

        this.root = root;
        this.port = port;
    }

    // success/failure callbacks
    success(action)
    {
        console.log("%s successful.", action);
    }
    failure(action, err)
    {
        let msg = action + ' failed: ' + err;
        throw new Error(msg);
    }

    // start sequelize
    async initSequelize()
    {

        let sequelize = new Sequelize('database', 'booknest', null, {
            host: 'localhost',
            dialect: "sqlite",
            storage: path.join(this.root, 'Backend')
        });
    
        try {
            await sequelize.authenticate(); // check database connection
            
            //init models
            let item = await init_item(sequelize);
            let order_item = await init_order_item(sequelize);
            let order = await init_order(sequelize);
            let user = await init_user(sequelize);
    
            // user has many orders, order belongs to one user
            user.hasMany(order,  {
                foreignKey: 'userID'
            });
            order.belongsTo(user, {
                foreignKey: 'userID'
            });
    
            // order has many order_item, order_item belongs to one order
            order.hasMany(order_item, {
                foreignKey: 'orderID'
            });
            order_item.belongsTo(order, {
                foreignKey: 'orderID'
            });
    
            // order_item has one item, item has many order_item
            item.hasMany(order_item, {
                foreignKey: 'itemID'
            });
            order_item.belongsTo(item, {
                foreignKey: 'itemID'
            });
    
            this.#sequelize = sequelize.sync();
    
        } catch (err) {
            throw err;
        }
    }

    // init controllers, app, server, and middleware
    async initApp()
    {
        try {

            if (!this.#sequelize) throw new Error('sequelize not found');

            InventoryManager.UpdateModels(this.#sequelize);
            UserManager.UpdateModels(this.#sequelize);

            const app = express();
            this.server = app.server;

            //init controllers

            this.router = new ViewRouter();

            // ejs view engine
            app.set('view engine', 'ejs');

            // use json for middleware
            app.use(express.json());

            // Initialize flash messages
            app.use(flash());

            // init session
            app.use(session({
                secret: 'your-secret-key', // Change this to a strong secret
                resave: false,
                saveUninitialized: true,
            }));

            const pub = path.join(this.root, 'public'); // BookNest/public

            // static files
            app.use(express.static(pub));

            this.imgStore = path.join(pub, 'uploads'); // public/uploads

            InventoryManager.UpdateMulter(this.imgStore);

            // Initialize the session client on first visit
            app.use(async (req, res, next) => {
                
                try {
                    let cli = req.session.client;
                    if (!cli) {
                        cli = new UserClient;

                        
                    }

                } catch {

                }
                
                next();
            });

            
            

            // Make flash messages accessible in templates
            app.use((req, res, next) => {
                res.locals.flashMessage = req.flash('info'); // or 'error', depending on your usage
                next();
            });

            //load frontend static files

            // Middleware to parse form data
            app.use(express.urlencoded({ extended: true }));
            
            this.app = app;
            return this.app;

        } catch (err) {
            throw err;
        }
        
    }

    
}


export default new AppManager;
