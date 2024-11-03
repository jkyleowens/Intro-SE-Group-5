import path from 'path'
import multer from 'multer'


// backend class for managing inventory and orders
class InventoryManager
{
    //models
    #item;
    #order;
    #order_item;

    //multer
    #storage; 
    #upload;

    // storage arrays
    #inv = []; // inv [ { item } ]
    #orders = []; // orders [ { order_item } ]


    constructor()
    {
        //store item/order models

        this.#item = null
        this.#order = null;
        this.#order_item = null;

        this.#storage = null;
        this.#upload = null; 
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
            throw 'InventoryManager: ' + err;
        }
    }

    async UpdateMulter(where)
    {
        // Configure Multer for file uploads
        const storage = multer.diskStorage({
            destination: where, // Save images here

            filename: (req, file, cb) => { // unique fileName
                const unique = Date.now() + '-' + req.body.isbn;
                const ext = path.extname(file.path);

                cb(null, (unique + ext)); // Unique file name + extension
            },
        });
        this.#storage = storage;
        this.#upload = multer({ storage: storage }); 
    }

    async search_item(attribute, value)
    {
        const condition = (attribute && value) ? { [attribute] : value } : {}; // find attribute of value if given
        const match = await this.#item.findAll({ where: condition });
        // return one item or array
        if (match.length === 1) return match[0];
        return match;
    }

    async search_order(attribute, value)
    {
        const condition = (attribute && value) ? { [attribute] : value } : {}; // find attribute of value if given
        const match = await this.#order.findAll({ where: condition });
        // return one item or array
        if (match.length === 1) return match[0];
        return match;
    }

    async search_order_item(attribute, value)
    {
        const condition = (attribute && value) ? { [attribute] : value } : {}; // find attribute of value if given
        const match = await this.#order_item.findAll({ where: condition });
        // return one item or array
        if (match.length === 1) return match[0];
        return match;
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
            throw 'InventoryManager: ' + err;
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
            throw 'InventoryManager: ' + err;
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
            throw 'InventoryManager: ' + err;
        }
    }

    async PlaceOrder(orderID)
    {
        const inv = this.#inv;

        try {
            //find order with id
            const order = await this.search_order('orderID', orderID);
            if (order.length === 0) throw `order with ID: ${orderID} not found`;

            //get order_items matched to order
            let res = await this.search_order_item('orderID', orderID);
            const arr = (res.length === 0) ? () => { throw 'cart is empty' } : arr;

            res = (!Array.isArray(arr)) ? [arr] : arr; // encaps in array if 1 


            // push orders
            res.forEach(async element => {

                const bookID = element.itemID;
                const quantity = element.quantity;

                element.status = 'active';

                const item = await this.search_item('itemID', bookID); // get book from order_item

                if (item.stock < quantity) throw 'not enough stock to fulfill this order';
                
                // subtract quantity from stock and update
                item.stock -= quantity;
                item.save();

                this.#orders.push(element); // add order_item to orders
            
            });
        } catch (err) {
            throw new 'InventoryManager: ' + err;
        }
    }

    UploadImage(attr) {

        if (this.#upload == null) throw 'multer not initialized';

        return this.#upload.single(attr);  
    }

    // create book with object containing details
    async CreateBook(details)
    {
        try {

            // extract details and make new item
            const { isbn, name, author, price, stock } = details;

            this.#inv.forEach(book => {
                if (book.itemID == isbn) throw 'book already exists';
            })

            if (!this.#item) throw 'item model not found';

            const book = await this.#item.create({
                itemID: isbn,
                name: name,
                author: author,
                price: price,
                stock: stock
            });

            this.#inv.push(book);

            return book;

        } catch (err) {
            throw 'InventoryManager: ' + err;
        }
    }

}



export default new InventoryManager;