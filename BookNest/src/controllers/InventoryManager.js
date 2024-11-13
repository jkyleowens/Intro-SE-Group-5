import path from 'path'

// backend class for managing inventory and orders
class InventoryManager
{
    //models
    #item;
    #order;
    #order_item;

    //multer
    #storage;

    constructor()
    {
        //store item/order models

        this.#item = null
        this.#order = null;
        this.#order_item = null;

        this.upload = null; 
    }

    failure(act, err)
    {
        const msg = 'User manager: ' + act + ' failed: ' + err;
        console.error(msg);
        return msg;
    }

    // update class model properties
    async UpdateModels(sequelize)
    {
        try {

            await sequelize.authenticate();

            this.#item = sequelize.models.item;
            this.#order = sequelize.models.order;
            this.#order_item = sequelize.models.order_item;

        } catch (err) {
            throw new Error(this.failure('getting models', err));
        }
    }


    async search_item(attribute, value)
    {
        try {
            const condition = (attribute && value) ? { [attribute] : value } : {}; // find attribute of value if given
            const match = await this.#item.findAll({ where: condition });
            // return one item or array
            if (match.length == 0) return null;
            if (match.length === 1) return match[0];
            return match;
        } catch (err) {
            throw new Error(this.failure('searching items', err));
        }
    }

    async search_order(...arg)
    {
        try {
            let ret = [];
            // loop through object arguments in arg[]
            for (let i = 0; i < arg.length; i++) {
                const {attr, value} = arg.at(i);
                if ((!attr && value) || (attr && !value)) throw `invalid arguments at arg[${i}]: {attr,val} was {${attr}, ${value}}`;

                if (attr == 'orderID') return await this.#order.findByPk(value);
                const condition = (attr && value) ? { [attr] : value } : {}; // find attribute of value if given
                const match = await this.#order.findAll({ where: condition }); // get all matches

                match.forEach( (order) => ret.push(order));
            }
            
            // return one item or array
            if (ret.length == 0) return null;
            if (ret.length == 1) return ret[0];
            return ret;

        } catch (err) {
            throw new Error(this.failure('searching orders', err));
        }

    }

    async search_order_item(...arg)
    {
        try {
            let ret = []
            // loop through object arguments in arg[]
            for (let i = 0; i < arg.length; i++) {
                const {attr, value} = arg.at(i);
                if ((!attr && value) || (attr && !value)) throw `invalid arguments at arg[${i}]: {attr,val} was {${attr}, ${value}}`;

                const condition = (attr && value) ? { [attr] : value } : {}; // find attribute of value if given
                const match = await this.#order_item.findAll({ where: condition }); // get all matches

                match.forEach( (order) => ret.push(order));
            }
            
            // return one item or array
            if (ret.length == 0) return null;
            return ret;

        } catch (err) {
            throw new Error(this.failure('searching order_items', err));
        }
    }


    async new_item(isbn=null, name=null, author=null, price=null, stock=null, coverImage=null)
    {
        try {
            //create new item model instance
            const temp = await this.#item.create({
                itemID: isbn,
                name: name,
                author: author,
                price: price,
                stock: stock,
                coverImage: coverImage
            });

            //increase stock
            
            return temp;

        } catch (err) {
            throw new Error(this.failure('creating new item', err));
        }
    }

    async new_order(userID=null, shipping=null, status=null, total=null)
    {
        try {
            //create new item model instance
            const temp = await this.#order.create({
                userID: userID,
                shipping: shipping,
                status: status,
                total: total
            });
            
            return temp;

        } catch (err) {
            throw new Error(this.failure('creating new order', err));
        }
    }

    async new_order_item(itemID=null, orderID=null, quantity=null)
    {
        try {
            //create new item model instance
            const temp = await this.#order_item.create({
                itemID: itemID,
                orderID: orderID,
                quantity: quantity
            });
            
            return temp;

        } catch (err) {
            throw new Error(this.failure('creating new order_item', err));
        }
    }

    async PlaceOrder(orderID, shipping=null)
    {

        try {

            let totalPrice = 0;

            const order = await this.search_order('orderID', orderID);
            if (!order) throw `order with ID: ${orderID} not found`;
            const cart = await this.search_order_item({ attr: 'orderID', value: orderID});

            //get user payment
            // try payment, if failed return without placing

            //update inventory 
            cart.forEach(async orderItem => {

                const item = await this.search_item('itemID', orderItem.itemID);
                const cost = item.price * orderItem.quantity;

                if (item.stock < orderItem.quantity) throw `not enough of item ${item.itemID} in stock`;
                totalPrice += cost;
                
                // update stock 
                item.stock -= quantity;
                await item.save();
            });

            // set order details
            order.total = totalPrice;
            order.status = 'pending';
            await order.save();

        } catch (err) {
            throw new Error(this.failure(`placing order ${orderID}`, err));
        }
    }

    // create book with object containing details
    async CreateBook(details)
    {
        try {

            // extract details and make new item
            const { isbn, name, author, price, stock, coverImage } = details;

            let book = this.search_item('itemID', isbn);
            if (book) throw `item with ID: ${isbn} already exists`;

            if (!this.#item) throw 'item model not found';

            book = await this.#item.create({
                itemID: isbn,
                name: name,
                author: author,
                price: price,
                stock: stock,
                coverImage: coverImage
            });

            return isbn;

        } catch (err) {
            throw new Error(this.failure('creating new book', err));
        }
    }

}



export default new InventoryManager;