import express from 'express';
import path from 'path';
import flash from 'connect-flash';
import multer from 'multer';

import AppManager from '../controllers/AppManager.js';
import InventoryManager from '../controllers/InventoryManager.js';
import UserManager from '../controllers/UserManager.js';


// router for essential frontend <---> backend operations
// catalog/cart, inventory and order management, account management
class APIRouter
{
    constructor() 
    {
        this.router = express.Router();
        // api
        const router = this.router;
        router.post('/register', this.Register);
        router.post('/login', this.Login);
        router.post('/add-cart', this.AddCart);
        router.post('/remove-cart', this.RemoveBook);
        router.post('/process-checkout', this.Checkout);

    }

    MulterSetup(imgStore) // send imgStore from AppManager
    {
        const storage = multer.diskStorage({
            destination: imgStore, // Save images here

            filename: (req, file, cb) => { // unique fileName
                const isbn = req.body.isbn;
                const unique = Date.now() + '-' + isbn;
                const ext = '.jpg';

                cb(null, (unique + ext)); // Unique file name + extension
            },
        });

        this.upload = multer({ storage: storage }); 

        // add new book upon post from client
        this.router.post('/add-book', this.upload.fields([
            { name: 'coverImage', maxCount: 1 },
            { name: 'isbn', maxCount: 1 }
        ]), this.AddBook);
    }

    // middleware for login
    Login = async (req, res) => {   
        // parse json string for details
        const email = req.body.email;
        const password = req.body.password;

        const response = { success: true, message: null };

        try {
            // check if user logged in
            const client = req.session.client; // UserClient userID
            if (client.userID != null) throw 'you are already logged in';

            const user = await UserManager.LoginUser(email, password); // send login request             

            response.message = `You successfully logged in to user account ${user.userID}! No items found in previous session.`;
            
            req.session.client.userID = user.userID;

            await UserManager.UpdateUserCart(req.session.client, req.session.client.cart.items);
            
            response.message = `You successfully logged in as ${user.name}!`;
            req.flash(response.message);
            return res.json(response);

            
        } catch (err) {
            response.message = `Could not log in to account with email ${email}: ` + err;
            response.success = false;
            req.flash('messages', response.message);
            return res.json(response);
        }
    }

    // middleware called upon /api/register posted by client
    Register = async (req, res) => {

        const username = req.body.name;
        const email = req.body.email;
        const password = req.body.password;

        const response = { success: true, message: null };

        try {
            // check if client object exists
            const client = req.session.client;
            if (client.userID) throw 'user already logged in';

            const userID = await UserManager.RegisterUser(username, email, password);
            if (!userID || userID == 0) throw 'registering returned null';
            
            // send userID back to client
            response.message = 'Registration was successful! You may now log in.';
            req.flash('messages', response.message);
            return res.json(response);

        } catch (err) {
            response.success = false;
            response.message = `error registering new user: ` + err;
            req.flash('messages', response.message);
            return res.json(response);
        }
        
    }

    Checkout = async (req, res) => {
        const { name, address, city, zip } = req.body; // get order details

        let act, order;
        try { 
            const client = req.session.client;
            let cartID = client.cart.orderID;
            const cart = client.cart.items;

            const shipping = name + "-" + address + "-" + city + "-" + zip; // combine details with delimiter for splitting

            if (cart.length == 0) throw 'your cart is empty';

            if (!client.userID) { // guest places order
                const order = await InventoryManager.new_order(null, shipping, 'inactive', 0);
                cartID = order.orderID;

                cart.forEach(async item => { // create order_item for each item
                    await InventoryManager.new_order_item(item.itemID, order.orderID, item.quantity);
                    cart.splice(item);
                });
            }
    
            // place order
            act = 'placing order';
            
            await InventoryManager.PlaceOrder(cartID, shipping);

            console.log(order);

            act = 'emptying cart';
            // empty cart
            const empty = await InventoryManager.new_order(client.userID, shipping, 'inactive', 0);
            client.cart.orderID = empty.orderID;
            client.cart.items = [];

            req.flash('messages', ('Successfully placed order ' + cartID));
            res.redirect('/');

            return res.redirect('/');
        } catch (err) { // error 
            req.flash('messages', 'There was an error placing your order.');
            res.redirect('/');
        }
            
    }

    AddBook = async (req, res) => {
        const result = {
            success: true,
            message: null
        };
        
        const isbn = req.body.isbn;
        const name = req.body.name;
        const author = req.body.author;
        const price = req.body.price;
        const stock = req.body.stock;
        const coverImage = req.files.coverImage[0].filename;

        const action = `Adding new book: {${isbn} ${name} ${author} $${price} ${stock}}`;
    
        let book = null;
        try {
            book = await InventoryManager.new_item(isbn, name, author, price, stock, coverImage);
            if (!book) throw `creating sequelize model instance returned null`;

            result.message = `${action} was successful!`;
            req.flash('messages', result.message);
            return res.json(result);
        } catch (err) {
            result.success = false;
            result.message = `Error ${action}! ` + err;
            req.session.flash('messages', result.message);
            return res.json(result);
        }
    }

    RemoveBook = async (req, res) => {
        const result = {
            success: true,
            message: null
        }
    
        // remove book from cart
        const bookId = req.body.itemID; // Get the book ID from the request
        const quantity = req.body.quantity * -1; // get quantity to remove (-)

        const user = req.session.client;
        const cartArr = req.session.client.cart.items;

        try { // Logic to remove the book from the cart
            
            // convert cart arr to map
            const cartMap = new Map(cartArr);
            const newNum = cartMap.get(bookId) - quantity;
            
            console.log(`removing ${quantity} items from cart. the new quantity should be ${newNum}`);

            //update cart
            await UserManager.UpdateUserCart(user, req.session.client.cart.items, [[bookId, quantity]]);


            result.message = 'Successfully removed book from cart!';
            req.flash('messages', result.message);
            return res.json(result);
        
        } catch (err) {
            result.message = 'There was an error removing book from cart: ' + err;
            req.flash('messages', result.message);
            return res.json(result);
        }   
    }

    //middleware for adding items to cart
    AddCart = async (req, res) => {
    
        const result = {
            success: true,
            message: null
        }
        // get bookID and quantity
        const bookId = req.body.itemID;
        const quantity = req.body.quantity;

        try {

            const book = await InventoryManager.search_item('itemID', bookId); //get book to add by ID
            if (!book) throw 'item could not be found'; 

            if (book.stock < quantity) throw `you tried to order ${quantity} items, only ${book.stock} are in stock!`;

            // session client details
            const user = req.session.client;

            result.message = `You successfully added ${quantity} items with ISBN ${book.itemID} to your cart!`;

            // for logged in users sync with database
            
            await UserManager.UpdateUserCart(user, req.session.client.cart.items, [[bookId, quantity]]);
            
            
            
            req.flash('messages', result.message);
            return res.json(result);
        
        } catch (err) {
            result.success = false;
            result.message = `Couldn't add item with ISBN ${bookId}: ` + err;

            req.flash('message', 'Error adding book to cart.');
            return res.json(result);
        }
    }

}


export default new APIRouter;