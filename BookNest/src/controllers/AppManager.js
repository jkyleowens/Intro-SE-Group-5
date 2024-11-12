import { Sequelize } from 'sequelize';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash'
import path from 'path';

import init_item from '../models/item.js';
import init_order_item from '../models/order_item.js';
import init_order from '../models/order.js';
import init_user from '../models/user.js';

import UserManager from './UserManager.js';
import InventoryManager from './InventoryManager.js';

import ViewRouter from '../routes/ViewRouter.js';
import APIRouter from '../routes/APIRouter.js';

class AppManager
{
    #sequelize = null;
    

    constructor () 
    {
        this.app = null;
        this.server = null;
        this.upload = null;

        this.imgStore = null;

        this.cookieExpires = 60; // num minutes until session resets
    }

    // success/failure callbacks
    success(action)
    {
        console.log("%s successful.", action);
    }
    failure(action, err)
    {
        let msg = 'AppManager: ' + action + ' failed: ' + err;
        console.error(msg);
        return msg;
    }

    // start sequelize
    async InitSequelize(root)
    {

        let sequelize = new Sequelize('database', 'booknest', null, {
            host: 'localhost',
            dialect: "sqlite",
            storage: path.join(root, 'src', 'database.db')
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
    
            this.#sequelize = await sequelize.sync();
    
        } catch (err) {
            throw new Error(this.failure('initializing sequelize', err));
        }
    }

    async CloseApp()
    {
        try {
            if (this.#sequelize != null) await this.#sequelize.close();

            if (!this.server) throw 'server not initialized';

            await this.server.close(() => {
                console.log('express server closed.');
            });

        } catch (err) {
            throw new Error(this.failure('closing AppManager', err));
        }
    }

    // init controllers, app, server, and middleware
    async InitApp(root)
    {
        try {

            if (!this.#sequelize) throw new Error('sequelize not found');

            await InventoryManager.UpdateModels(this.#sequelize);
            await UserManager.UpdateModels(this.#sequelize);

            const app = express();

            const pub = path.join(root, 'public'); // BookNest/public
            // static files
            app.use(express.static(pub));
            this.imgStore = path.join(pub, 'uploads');
            // init session
            app.use(session({
                secret: 'your-secret-key', // Change this to a strong secret
                resave: false,
                saveUninitialized: true,
                cookie: { maxAge: 1000 * (60 * this.cookieExpires) } // cookie expires after an hour
            }));

            // new client object to store details and cart
            app.use((req, res, next) => {
                if (!req.session.client) {
                    // client object with user and cart details
                    req.session.client = { 
                        userID: null, 
                        name: null,
                        cart: { orderID: null, items: [] } //items [...[itemID, quantity]]
                    } 
                    console.log('Client session object created!');
                }
                next();
            });

            // ejs view engine
            app.set('view engine', 'ejs');
            app.set('views', path.join(root, 'src', 'views'));

            // use json for middleware
            app.use(express.json());

            // Initialize flash messages
            app.use(flash());

            // Make flash messages accessible in templates
            app.use((req, res, next) => {
                res.locals.messages = req.flash('messages'); // or 'error', depending on your usage
                next();
            });

            // Middleware to parse form data
            app.use(express.urlencoded({ extended: true }));
            
            app.use('/', ViewRouter.router);
            app.use('/api', APIRouter.router);
            
            this.app = app;
            return app;

        } catch (err) {
            throw new Error(this.failure('initializing app', err));
        }
        
    }

    
}


export default new AppManager;
