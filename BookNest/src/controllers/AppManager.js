import { Sequelize } from 'sequelize';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash'
import path from 'path';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';
import pg from 'pg';

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

        let sequelize = new Sequelize(
            process.env.POSTGRES_DATABASE, 
            process.env.POSTGRES_USER, 
            process.env.POSTGRES_PASSWORD, 
            {
                host: process.env.POSTGRES_HOST,
                dialect: 'postgres',
                dialectModule: pg,
                port: process.env.POSTGRES_PORT || 5432,
                logging: false,
                dialectOptions: {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                }
            }
        );
    
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

        } catch (err) {
            throw new Error(this.failure('closing AppManager', err));
        }
    }

    // init controllers, app, server, and middleware
    async InitApp()
    {
        try {

            if (!this.#sequelize) throw new Error('sequelize not found');

            await InventoryManager.UpdateModels(this.#sequelize);
            await UserManager.UpdateModels(this.#sequelize);

            const app = express();

            // redis session storage
            const redisClient = new Redis(process.env.REDIS_URL);

            // init session
            app.use(session({
                store: new RedisStore({ client: redisClient }),
                secret: process.env.SESSION_SECRET, // variable declared in .env (environment variable)
                resave: false,
                saveUninitialized: false,
                cookie: { 
                    secure: false,
                    maxAge: 1000 * (60 * this.cookieExpires),
                    httpOnly: true
                }}));

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
            
            // use json for middleware
            app.use(express.json());

            // Initialize flash messages
            app.use(flash());

            // Make flash messages accessible in templates
            app.use((req, res, next) => {
                res.locals.messages = req.flash('messages'); // or 'error', depending on your usage
                next();
            });
            
            this.app = app;
            return app;

        } catch (err) {
            throw new Error(this.failure('initializing app', err));
        }
        
    }

    
}


export default new AppManager;

export { APIRouter, ViewRouter };