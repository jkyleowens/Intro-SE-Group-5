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

    // storage arrays
    #inv = []; // inv [ { item } ]
    #orders = []; // orders [ { order_item } ]


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
            if (match.length === 1) return match[0];
            return match;
        } catch (err) {
            throw new Error(this.failure('searching items', err));
        }
    }

    async search_order(attribute, value)
    {
        try {
            const condition = (attribute && value) ? { [attribute] : value } : {}; // find attribute of value if given
            const match = await this.#order.findAll({ where: condition });
            // return one item or array
            if (match.length === 1) return match[0];
            return match;
        } catch (err) {
            throw new Error(this.failure('searching orders', err));
        }

    }

    async search_order_item(attribute, value)
    {
        try {
        const condition = (attribute && value) ? { [attribute] : value } : {}; // find attribute of value if given
        const match = await this.#order_item.findAll({ where: condition });
        // return one item or array
        if (match.length === 1) return match[0];
        return match;
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

    async PlaceOrder(orderID, shipping=null, )
    {
        const inv = this.#inv;

        try {
            //find order with id
            const order = await this.search_order('orderID', orderID);
            if (order.length === 0) throw `order with ID: ${orderID} not found`;
            if (order.status == 'active') throw `order with ID: ${orderID} is active`;

            // CHARGE CARD HERE

            this.#orders.push(order);

            //get order_items matched to order
            let res = await this.search_order_item('orderID', orderID);
            const arr = (res.length === 0) ? () => { throw 'cart is empty' } : arr;

            res = (!Array.isArray(arr)) ? [arr] : arr; // encaps in array if 1 
            
            let totalPrice = 0;

            //update inventory 
            res.forEach(async element => {

                const bookID = element.itemID;
                const quantity = element.quantity;
                
                const item = await this.search_item('itemID', bookID); // get book from order_item

                // add price
                totalPrice += item.price * quantity;

                if (item.stock < quantity) throw `not enough of item ${bookID} in stock`;
                
                // update stock 
                item.stock -= quantity;
                
                item.save();
                 // add order_item to orders
                
            });

            // set order details
            order.total = totalPrice;
            order.status = 'pending';
            order.save();

        } catch (err) {
            throw new Error(this.failure(`placing order ${orderID}`, err));
        }
    }

    // create book with object containing details
    async CreateBook(details)
    {
        try {

            // extract details and make new item
            const { isbn, name, author, price, stock, coverImage } = JSON.parse(details);

            this.#inv.forEach(book => {
                if (book.itemID == isbn) throw 'book already exists';
            })

            if (!this.#item) throw 'item model not found';

            const book = await this.#item.create({
                itemID: isbn,
                name: name,
                author: author,
                price: price,
                stock: stock,
                coverImage: coverImage
            });

            this.#inv.push(book);

            return book;

        } catch (err) {
            throw new Error(this.failure('creating new book', err));
        }
    }

}



export default new InventoryManager;