
import AppManager from "../../app.js";
import bcrypt from 'bcryptjs';
import InventoryManager from "./InventoryManager.js";

// backend user management class
class UserManager
{
    #user;

    constructor()
    {
        this.#user = null;
    }

    failure(act, err)
    {
        const msg = 'User manager: ' + act + ' failed: ' + err;
        console.error(msg);
        return msg;
    }

    // update class user model property
    async UpdateModels(sequelize)
    {
        try {

            await sequelize.authenticate();

            this.#user = sequelize.models.user;

        } catch (err) {
            throw new Error(this.failure('getting user model', err));
        }
    }

    // none or many arguments ({'userID', userID}, etc)
    // cannot search PK along with other values (e.g. ValidateUsers({ attr: 'userID', value: id }, {attr: 'name', value: name}))
    async ValidateUsers(...arg)
    {
        try {
            let arr = [];
            // search each key value pair
            for (let i = 0; i < arg.length; i++) {
                const { attr, value } = arg[i];
                if (attr && !value) throw `error at arg[${i}]: attribute name given with no value`;
                if (!attr && value) throw `error at arg[${i}]: value given with no attribute name`;

                console.log(`Searching attribute ${attr} for value ${value}...`);

                // find attribute matching value if given or get all
                const condition = (attr && value) ? ({ [attr] : value }) : {}; 
                const res = await this.#user.findAll({ where: condition });

                res.forEach(entry => { 
                    arr.push(entry);
                });
            }

            if (arr.length == 0) return null;
            console.log('ValidateUsers: %d accounts found:', arr.length);
            arr.forEach(val => {
                console.log('ID: %d    name: %s    email: %s    password: %s', val.userID, val.name, val.email, val.password);
                
            });

            console.log(arr[0]);
            if (arr.length == 1) return arr[0];
            
            return arr;

        } catch (err) {
            throw new Error(this.failure('validating users', err));
        }
        
    }

    async LoginUser(email, password)
    {
        try {
            // encrypt & salt details here

            const match = await this.ValidateUsers({ attr:'email', value: email }); // find user
            if (!match) throw 'no user found with that email';

            const pass = match.password;

            console.log(`user's password: (${pass})    password entered: ${password}`);

            if (pass === password) return match;
            
            throw 'the password you entered was incorrect';
            
            
        } catch (err) { 
            throw 'logging in user' + err;
        }
    }

    async RegisterUser(username, email, password)
    {
        console.log('Backend processing registration data');
        try {

            // see if user exists
            let user = await this.ValidateUsers({attr: 'email', value: email}, { attr: 'name', value: username });

            if (user) {
                if (user.name === username) throw `user with username ${username} already exists!`;
                if (user.email === email) throw `user with email ${email} already exists!`;
            }

            const ret = await this.#user.create({
                name: username,
                email: email,
                password: password
            });

            return ret.userID;

            //return
        } catch (err) {
            throw `registering new user ${username}` + err;
        }
        
    }

    // synchronize current session cart with inactive order linked to stored cart
    // newArr(optional) & cartArr are arrays of [...[itemID, quantity]]
    async UpdateUserCart(user, cartArr=[[]], addArr=[[]]) 
    {
        const userID = user.userID;
        let orderID = user.cart.orderID;
        try {
            // block 1 ---> update cart with add
            console.log('block 1: \ncreating maps');
            const cartMap = new Map(cartArr); 
            const addMap = new Map(addArr);
            let dataMap = null;
            const newMap = new Map(cartMap.entries());

            console.log('creating sets...');
            let setA = new Set(addMap.keys()); // A = itemID to add
            let setB = new Set(cartMap.keys()); // B = itemID in cart
            let setX = [], setY = [], setZ = [];
            let data = null, order = null;

            if (userID) { // search/create cart order
                order = await InventoryManager.search_order({attr:'userID', value:userID}, {attr:'status', value:'inactive'});
                order = (order) ? order : await InventoryManager.new_order(userID, null, 'inactive', 0);

                data = await InventoryManager.search_order_item({attr: 'orderID', value: order.orderID}); // get order items
                dataMap = (data) ? new Map(data.map((item) => [item.itemID, item.quantity])) : null;
                let setD = (dataMap) ? new Set(dataMap.keys()) : new Set;

                for (const key of setD) { // merge database and cart
                    if (!cartMap.has(key)) cartMap.set(key, dataMap.get(key));
                    newMap.set(key, cartMap.get(key));
                }

                // set client cart order
                orderID = order.orderID;
                user.cart.orderID = orderID;
            }

            let newSet = new Set(newMap.keys()); // new cart updated with db
            
            if (setA.size > 0) {
                setX = setA.intersection(newSet); // added/removed items in cart
                setY = setA.difference(newSet);
            }
                
            // cart items being changed
            for (const key of setX) newMap.set(key, (newMap.get(key), (addMap.get(key) + newMap.get(key))));

            for (const key of setY) newMap.set(key, (addMap.get(key)));
            

            console.log('updating client session');
            // empty session cart
            cartArr.splice(0, cartArr.length);
            // update cart
            for (const [key,val] of newMap.entries()) { 
                if (val < 1 || !val) continue;
                console.log(`adding item ${key} with quantity ${val}`);
                cartArr.push([key,val]); // newMap [key,val] ---> cart[]
            }

            // block 2 ---> sync database and cart if logged in
            if (!userID) return;
            console.log('syncing database with cart');

            let dataSet = (dataMap) ? new Set(dataMap.keys()) : new Set;

            let quantity = null, orderItem = null;
            for (const [key, val] of newMap.entries()) { // update database
                console.log(`item ${key}: updating database with quantity ${val}`);
                if (dataSet.has(key)) { // database item exists, get item if quantity changed
                    const orders = await InventoryManager.search_order_item({attr: 'orderID', value: orderID},{attr: 'itemID', value: key});
                    orderItem = orders.at(0);
                }
                
                if (!orderItem) { // create new database item with quantity otherwise
                    console.log('creating order_item with orderID: %d, itemID: %d, and quantity: %d', orderID, key, val);
                    orderItem = await InventoryManager.new_order_item(key, orderID, val);
                    continue;
                }

                orderItem.quantity = val;
                if (orderItem.quantity < 1) orderItem.destroy();
                else orderItem.quantity = val;

                if (orderItem) orderItem.save();

            }

            return;
        } catch (err) {
            console.error(new Error(err));
            throw `updating cart for user ${userID}: ` + err;
        }

    }
}



export default new UserManager;