
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
        let order = [], data = []; // store inactive order only if user logged in

        const userID = user.userID;
        try {
            if (userID) {
                order = await InventoryManager.search_order({attr:'userID', value:userID}, {attr:'status', value:'inactive'});
                if (!order) order = await InventoryManager.new_order(userID, null, 'inactive');
                user.cart.orderID = order.orderID;
            }
            // block 1 ---> update cart with add
            
            console.log('block 1: creating maps');
            const cartMap = new Map(cartArr); 
            console.log('addArr map');
            const addMap = new Map(addArr);
            const newMap = new Map([[]]);
            console.log('block 1: creating sets');
            const setA = new Set(addMap.keys()); // A = itemID to add
            const setB = new Set(cartMap.keys()); // B = itemID in cart

            let setC = [], setD = [];
            if (setA.size > 0) {
                setC = setA.intersection(setB); // C = intersection (A U B) ---> similar items to update quantity
                setD = setA.difference(setB); // D = A unique from B ---> new items to add
            }

            

            console.log('adding items to cart');
            // shared items of cart and new array
            for (const key of setC) {
                const val = addMap.get(key) + cartMap.get(key);
                console.log(`adding ${addMap.get(key)} items with ID: ${key} to cart. The updated quantity is ${val}`);
                newMap.set(key, Math.max(val, 0)); // newMap will replace db and cart items
                if (newMap.get(key) < 1) newMap.delete(key);
            }
            // unique items to add to cart
            for (const key of setD) {
                console.log(`adding ${addMap.get(key)} items with ID: ${key} to cart. The updated quantity is ${addMap.get(key)}`);
                newMap.set(key, addMap.get(key));
            }
            console.log('updating client session');
            // empty session cart
            cartArr.splice(0, cartArr.length);
            // update cart
            for (const [key,val] of newMap.entries()) { 
                if (!val || !key || val === 0) continue;
                cartArr.push([key,val]); // newMap ---> cart
            }
            const prevCart = newMap;

            // no DB access not logged in
            if (!userID) return;

            // block 2 ---> sync database and cart
            
            // maps/sets for comparing
            const dataMap = (data) ? new Map(data.map(obj => [obj.itemID, obj.quantity])) : new Map([[]]); // order_item map [...[itemID, num]] or [[]]

            const dataPrev = dataMap;
            console.log('setting database map');
            // for all new items set database quantity
            for (const key of setA) {
                dataMap.set(key, newMap.get(key));
            }
            
            
            console.log('performing set operations');
            let setX, setY, setZ;
            const dataSet = (dataMap) ? new Set(dataMap.keys()) : new Set([]); // set of database items
            const newSet = (newMap) ? new Set(newMap.keys()) : new Set([]); // set for final cart 

            if (dataSet.size > 0) {
                setX = dataSet.symmetricDifference(newSet);
                setY = dataSet.intersection(newSet);
                setZ = dataSet.difference(newSet);
            }
            

            console.log('syncing database and cart');

            //loop similar items & set max
            for (const key of setY) {
                if (dataMap.get(key) > newMap.get(key)) newMap.set(key, dataMap.get(key));
                else dataMap.set(key, newMap.get(key));
            }
            // loop unique itemIDs
            for (const key of setX) {
                if (dataMap.has(key)) newMap.set(key, dataMap.get(key));
                else dataMap.set(key, newMap.get(key));
            }
            // update database with updated values
            for (const [key,val] of dataMap.entries()) {
                if (!dataPrev.has(key)) {
                    await InventoryManager.new_order_item(key, order.orderID, val);
                    continue;
                }
                if (dataPrev.get(key) == val) continue;
                const temp = await InventoryManager.search_order_item({attr:'orderID', value:order.orderID}, {attr:'itemID', val:key});
                temp[0].quantity = val;
                await temp[0].save();
            }
            console.log('reupdating cart');
            for (const [key, val] of newMap.entries()) {
                if (!prevCart.has(key)) cartArr.push([key, val]);
            }

            return;
        } catch (err) {
            console.error(new Error(err));
            throw `updating cart for user ${userID}: ` + err;
        }

    }
}



export default new UserManager;